import json
import asyncio
from typing import Any
from uuid import uuid4

import httpx
from pydantic import BaseModel, ValidationError

from .config import Settings
from .models import (
    ChatMessage,
    Feedback,
    Persona,
    PersonaId,
    PersonalityStyle,
    Scenario,
    ScenarioList,
)
from .prompts import evaluation_prompt, reply_prompt, scenario_prompt


class ConfigurationError(RuntimeError):
    pass


class UpstreamAIError(RuntimeError):
    pass


class InvalidAIResponseError(RuntimeError):
    pass


class ConversationService:
    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._client = client

    def _require_apim_config(self) -> tuple[str, str]:
        endpoint = self._settings.chat_endpoint
        if not endpoint:
            raise ConfigurationError(
                "APIM_CHAT_URL 또는 APIM_BASE_URL이 설정되지 않았습니다."
            )
        if not self._settings.apim_key:
            raise ConfigurationError("APIM_KEY 환경 변수가 설정되지 않았습니다.")
        return endpoint, self._settings.apim_key

    def _limited_history(self, messages: list[ChatMessage]) -> list[ChatMessage]:
        message_limit = self._settings.history_turns * 2
        return messages[-message_limit:]

    def _headers(self, key: str) -> dict[str, str]:
        key_header = self._settings.apim_key_header.strip() or "api-key"
        key_value = f"Bearer {key}" if key_header.lower() == "authorization" else key
        return {
            "Content-Type": "application/json",
            key_header: key_value,
            "X-Client-Request-Id": str(uuid4()),
        }

    async def _send_request(
        self,
        endpoint: str,
        key: str,
        payload: dict[str, Any],
    ) -> httpx.Response:
        response: httpx.Response | None = None
        for attempt in range(3):
            try:
                if self._client is not None:
                    response = await self._client.post(
                        endpoint,
                        headers=self._headers(key),
                        json=payload,
                    )
                else:
                    async with httpx.AsyncClient(
                        timeout=self._settings.apim_timeout_seconds
                    ) as client:
                        response = await client.post(
                            endpoint,
                            headers=self._headers(key),
                            json=payload,
                        )
            except httpx.RequestError as exc:
                if attempt == 2:
                    raise UpstreamAIError("APIM에 연결하지 못했습니다.") from exc
                await asyncio.sleep(0.5 * (2**attempt))
                continue

            if response.status_code not in {429, 500, 502, 503, 504} or attempt == 2:
                break

            retry_after = response.headers.get("retry-after")
            try:
                delay = min(float(retry_after), 5.0) if retry_after else 0.5 * (2**attempt)
            except ValueError:
                delay = 0.5 * (2**attempt)
            await asyncio.sleep(delay)

        if response is None:
            raise UpstreamAIError("APIM 응답을 받지 못했습니다.")

        if response.is_error:
            request_id = response.headers.get("x-request-id") or response.headers.get(
                "apim-request-id"
            )
            suffix = f" (request id: {request_id})" if request_id else ""
            raise UpstreamAIError(
                f"APIM이 HTTP {response.status_code} 오류를 반환했습니다.{suffix}"
            )
        return response

    @staticmethod
    def _extract_content(response: httpx.Response) -> str:
        try:
            data = response.json()
            content = data["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise InvalidAIResponseError(
                "APIM 응답이 Chat Completions 형식이 아닙니다."
            ) from exc

        if isinstance(content, str):
            text = content.strip()
        elif isinstance(content, list):
            text = "".join(
                part.get("text", "")
                for part in content
                if isinstance(part, dict) and part.get("type") in {"text", "output_text"}
            ).strip()
        else:
            text = ""

        if not text:
            raise InvalidAIResponseError("APIM이 빈 AI 답변을 반환했습니다.")
        return text

    async def _chat(
        self,
        messages: list[dict[str, str]],
        response_model: type[BaseModel] | None = None,
    ) -> str:
        endpoint, key = self._require_apim_config()
        payload: dict[str, Any] = {
            "model": self._settings.chat_model,
            "messages": messages,
        }
        if response_model is not None:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": response_model.__name__,
                    "strict": True,
                    "schema": response_model.model_json_schema(by_alias=True),
                },
            }

        response = await self._send_request(endpoint, key, payload)
        return self._extract_content(response)

    @staticmethod
    def _parse_json(content: str, response_model: type[BaseModel]) -> BaseModel:
        candidate = content.strip()
        if candidate.startswith("```") and candidate.endswith("```"):
            candidate = candidate[3:-3].strip()
            if candidate.lower().startswith("json"):
                candidate = candidate[4:].strip()
        try:
            return response_model.model_validate_json(candidate)
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            raise InvalidAIResponseError(
                "APIM의 AI 응답이 필요한 JSON 구조와 맞지 않습니다."
            ) from exc

    async def suggest_scenarios(
        self,
        persona_id: PersonaId,
        personality: PersonalityStyle,
    ) -> list[Scenario]:
        content = await self._chat(
            [
                {"role": "system", "content": "요청한 JSON 구조를 정확히 지키세요."},
                {
                    "role": "user",
                    "content": scenario_prompt(persona_id, personality),
                },
            ],
            ScenarioList,
        )
        parsed = self._parse_json(content, ScenarioList)
        if not isinstance(parsed, ScenarioList):
            raise InvalidAIResponseError("상황 응답을 검증하지 못했습니다.")

        scenarios = [
            scenario.model_copy(update={"persona_id": persona_id})
            for scenario in parsed.scenarios
        ]
        if len({scenario.id for scenario in scenarios}) != 5:
            raise InvalidAIResponseError("생성된 상황의 id가 서로 다르지 않습니다.")
        return scenarios

    async def reply(
        self,
        persona: Persona,
        personality: PersonalityStyle,
        scenario: Scenario,
        messages: list[ChatMessage],
        user_message: str,
        turn: int,
    ) -> str:
        prompt = reply_prompt(
            persona,
            personality,
            scenario,
            self._limited_history(messages),
            user_message,
            turn,
        )
        return await self._chat(
            [
                {
                    "role": "system",
                    "content": (
                        "당신은 어린이 상담자 '눈치코치'입니다. "
                        "상담자 정체성을 유지하되 연습 단계에는 상담 상대가 할 법한 "
                        "짧은 대사 한 문장을 제시할 수 있습니다. "
                        "상대 대사는 반드시 상담 상대가 아이에게 하는 말이어야 하며, "
                        "아이가 상대에게 해야 할 정답을 상대 대사로 표시하면 안 됩니다. "
                        "선택한 상담 방식을 유지하세요. "
                        "초반에는 상황·감정·원하는 점을 파악하고, 이후 학생이 직접 답하는 "
                        "롤플레이와 실제 답변에 근거한 피드백·재시도·종료를 진행하세요. "
                        "안전 상황이 아닌 1턴에는 롤플레이를 시작하지 말고 구체적 공감과 "
                        "누락 정보 질문 하나만 하세요. 롤플레이 전환은 2턴부터 가능합니다. "
                        "학생이 해야 할 정답 문장을 먼저 만들지 마세요. "
                        "상대 대사에 학생이 답한 직후에는 새 상대 대사를 절대 만들지 말고, "
                        "부족하면 상대 대사 없이 재시도시키고 적절하면 마무리하세요. "
                        "5턴은 상한일 뿐 목표가 아닙니다. 학생이 적절히 한 번 답하면 "
                        "새 상대 반응이나 추가 연습을 만들지 말고 구체적으로 칭찬하며 마무리하세요. "
                        "아이에게 무조건 참으라고 하거나 훈계하지 마세요."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
        )

    async def evaluate(
        self,
        persona: Persona,
        personality: PersonalityStyle,
        scenario: Scenario,
        messages: list[ChatMessage],
    ) -> Feedback:
        content = await self._chat(
            [
                {
                    "role": "system",
                    "content": (
                        "대화를 따뜻하고 구체적으로 평가하세요. "
                        "관계와 상황에 맞는 예절을 행동 중심으로 알려 주고, "
                        "따옴표 대사나 따라 말할 예문은 만들지 마세요."
                    ),
                },
                {
                    "role": "user",
                    "content": evaluation_prompt(
                        persona,
                        personality,
                        scenario,
                        self._limited_history(messages),
                    ),
                },
            ],
            Feedback,
        )
        parsed = self._parse_json(content, Feedback)
        if not isinstance(parsed, Feedback):
            raise InvalidAIResponseError("평가 응답을 검증하지 못했습니다.")
        return parsed
