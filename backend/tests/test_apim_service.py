import asyncio
import json

import httpx

from app.config import Settings
from app.models import Persona, PersonalityStyle, Scenario
from app.service import ConversationService


PERSONA = Persona.model_validate(
    {
        "id": "parent",
        "label": "부모님",
        "emoji": "👩",
        "name": "지은",
        "gender": "여성",
        "relationship": "엄마",
        "personality": "따뜻해요",
        "tone": "차분해요",
        "color": "#ffffff",
    }
)
PERSONALITY = PersonalityStyle.model_validate(
    {
        "id": "kind",
        "label": "다정한",
        "emoji": "💗",
        "description": "따뜻하게 대답해요.",
    }
)
SCENARIO = Scenario.model_validate(
    {
        "id": "test-scenario",
        "personaId": "parent",
        "emoji": "💬",
        "title": "대화 연습",
        "hint": "차분히 말해요",
        "openingLine": "무슨 일이니?",
    }
)


def test_chat_endpoint_prefers_full_url() -> None:
    settings = Settings(
        apim_base_url="https://base.example.com",
        apim_chat_path="/base-chat",
        apim_chat_url="https://chat.example.com/custom-chat",
    )
    assert settings.chat_endpoint == "https://chat.example.com/custom-chat"


def test_chat_endpoint_replaces_model_placeholder() -> None:
    settings = Settings(
        apim_base_url="https://apim.example.com/foundry",
        apim_chat_path="/{model}/chat/completions",
        chat_model="gpt-5.4",
    )
    assert settings.chat_endpoint == (
        "https://apim.example.com/foundry/gpt-5.4/chat/completions"
    )


def test_reply_calls_apim_chat_completions() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["key"] = request.headers.get("api-key")
        captured["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"role": "assistant", "content": "응, 이야기해 줘."}}
                ]
            },
        )

    async def run() -> str:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            service = ConversationService(
                Settings(
                    apim_base_url="https://apim.example.com/",
                    apim_chat_path="/v1/chat/completions",
                    apim_key="secret",
                    chat_model="gpt-5.4",
                    history_turns=5,
                ),
                client,
            )
            return await service.reply(
                PERSONA,
                PERSONALITY,
                SCENARIO,
                [],
                "이야기하고 싶어.",
                1,
            )

    assert asyncio.run(run()) == "응, 이야기해 줘."
    assert captured["url"] == "https://apim.example.com/v1/chat/completions"
    assert captured["key"] == "secret"
    assert captured["body"]["model"] == "gpt-5.4"  # type: ignore[index]


def test_transient_apim_errors_are_retried() -> None:
    attempts = 0

    def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            return httpx.Response(429, headers={"retry-after": "0"})
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"role": "assistant", "content": "천천히 말해 줘."}}
                ]
            },
        )

    async def run() -> str:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            service = ConversationService(
                Settings(
                    apim_base_url="https://apim.example.com",
                    apim_key="secret",
                ),
                client,
            )
            return await service.reply(
                PERSONA,
                PERSONALITY,
                SCENARIO,
                [],
                "이야기하고 싶어.",
                1,
            )

    assert asyncio.run(run()) == "천천히 말해 줘."
    assert attempts == 3


def test_reply_removes_markdown_formatting() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "## 연습\n**짧게** `말해 봐`.",
                        }
                    }
                ]
            },
        )

    async def run() -> str:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            service = ConversationService(
                Settings(
                    apim_base_url="https://apim.example.com",
                    apim_key="secret",
                ),
                client,
            )
            return await service.reply(
                PERSONA,
                PERSONALITY,
                SCENARIO,
                [],
                "뭐라고 해야 돼?",
                5,
            )

    result = asyncio.run(run())
    assert result == "연습\n짧게 말해 봐."
    assert "**" not in result
    assert "##" not in result
    assert "`" not in result
