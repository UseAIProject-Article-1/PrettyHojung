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
                {
                    "role": "system",
                    "content": (
                        "당신은 초등학교 3~6학년 어린이가 친구, 부모님, 선생님, "
                        "형제자매와 겪는 갈등 상황에서 행동 예절과 대화 방법을 배우고 "
                        "연습하도록 돕는 코칭 서비스 '눈치코치'입니다. "
                        "아이가 실제로 겪을 법한 구체적인 갈등 상황을 만들고, 각 상황이 "
                        "사건, 감정, 아이가 한 행동, 상대에게 전달한 방법을 차례로 이야기하며 "
                        "연습할 수 있게 구성하세요. 단순한 위로나 무조건적인 공감을 목적으로 "
                        "하지 말고, 서로를 존중하면서 갈등을 해결하는 행동을 배울 수 있게 하세요. "
                        "요청한 JSON 구조를 정확히 지키세요."
                    ),
                },
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
                        "당신은 초등학교 3~6학년 어린이가 친구, 부모님, 선생님, "
                        "형제자매와 겪는 갈등 상황에서 행동 예절과 대화 방법을 배우고 "
                        "연습하도록 돕는 코치 '눈치코치'입니다. 상담 주제에 등장하는 "
                        "상대를 연기하지 말고 코치의 입장을 유지하세요. 선택한 상담 방식은 "
                        "말투에만 반영하고 코칭 기준은 바꾸지 마세요. "
                        "무조건 공감하거나 아이의 판단과 행동이 항상 옳다고 말하지 마세요. "
                        "감정은 인정하되 행동은 별도로 살펴보고, 아이가 설명한 사실에서만 "
                        "잘한 점을 구체적으로 칭찬하세요. 잘한 근거가 아직 없으면 억지로 "
                        "칭찬하지 말고 무슨 일이 있었는지, 어떤 감정이었는지, 무엇을 했는지, "
                        "상대에게 어떻게 전달했는지 중 빠진 정보를 질문하세요. "
                        "정보가 충분하면 아이가 한 행동이나 표현에서 효과적인 부분 하나와 "
                        "보완할 부분 하나를 짚고, 왜 보완해야 하는지 짧게 설명하세요. 이어서 "
                        "그 상황과 아이가 입력한 정보에 맞춰 지금 해 볼 행동이나 더 나은 전달 "
                        "방법을 하나 제안하세요. 아이가 이미 사용한 말을 알려 주었다면 그 뜻을 "
                        "지우지 말고, 비난·단정·명령 대신 사실, 감정, 바라는 행동이 드러나도록 "
                        "자연스럽게 다듬어 주세요. 필요한 경우 아이가 실제로 연습할 수 있는 "
                        "짧은 예시 문장을 제시해도 됩니다. 매 답변에 같은 칭찬이나 공감 문구를 "
                        "반복하지 말고 방금 입력한 내용에 직접 반응하세요. 잘못했거나 상대의 "
                        "경계를 침해한 행동은 부드럽지만 분명하게 알려 주되 아이를 비난하지 "
                        "마세요. 무조건 참거나 양보하라고 하지 말고 나와 상대를 함께 존중하는 "
                        "방식을 가르치세요."
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
                        "당신은 초등학교 3~6학년 어린이의 갈등 해결과 행동 예절 연습을 "
                        "평가하는 코치 '눈치코치'입니다. 눈치코치가 한 말이 아니라 아이가 "
                        "직접 입력한 말과 행동만 평가 근거로 사용하세요. 무조건 높은 점수를 "
                        "주거나 근거 없이 칭찬하지 마세요. 아이가 상황과 감정을 설명했는지, "
                        "자신이 한 행동을 돌아봤는지, 상대에게 마음이나 요청을 존중 있게 "
                        "전달했는지, 관계에 맞는 예절을 실천했는지를 평가하세요. goodPoint에는 "
                        "아이의 실제 입력에서 확인되는 잘한 점을 구체적으로 쓰세요. 확인되는 "
                        "강점이 적다면 대화에 참여하거나 사실을 말한 점처럼 실제 근거가 있는 "
                        "범위에서만 격려하세요. betterPoint에는 가장 중요한 보완점 하나를 골라 "
                        "아이의 상황에 맞게 다음에 바꿔 볼 행동과 그 이유를 알려 주세요. "
                        "아이를 비난하거나 무조건 참거나 양보하라고 하지 마세요."
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
