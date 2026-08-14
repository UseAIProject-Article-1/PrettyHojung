from fastapi.testclient import TestClient

from app.main import app, get_conversation_service
from app.models import ChatMessage, Feedback, Persona, PersonalityStyle, Scenario
from app.prompts import reply_prompt, scenario_prompt


PERSONA = {
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
PERSONALITY = {
    "id": "kind",
    "label": "다정한",
    "emoji": "💗",
    "description": "따뜻하게 대답해요.",
}
SCENARIO = {
    "id": "test-scenario",
    "personaId": "parent",
    "emoji": "💬",
    "title": "대화 연습",
    "hint": "차분히 말해요",
    "openingLine": "무슨 일이니?",
}


class FakeConversationService:
    async def suggest_scenarios(
        self,
        persona_id: str,
        _personality: PersonalityStyle,
    ) -> list[Scenario]:
        return [
            Scenario.model_validate(
                {
                    **SCENARIO,
                    "id": f"scenario-{index}",
                    "personaId": persona_id,
                }
            )
            for index in range(5)
        ]

    async def reply(self, *args: object) -> str:
        return "차분히 이야기해 줘서 고마워."

    async def evaluate(self, *args: object) -> Feedback:
        return Feedback(
            score=90,
            goodPoint="내 마음을 분명히 말했어요.",
            betterPoint="바라는 행동도 함께 말해 봐요.",
        )


app.dependency_overrides[get_conversation_service] = lambda: FakeConversationService()
client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_suggest_scenarios_uses_frontend_field_names() -> None:
    response = client.post(
        "/api/conversation/suggest-scenarios",
        json={"personaId": "parent", "personality": PERSONALITY},
    )
    assert response.status_code == 200
    assert len(response.json()) == 5
    assert response.json()[0]["personaId"] == "parent"
    assert response.json()[0]["openingLine"] == "무슨 일이니?"


def test_reply_returns_json_string() -> None:
    response = client.post(
        "/api/conversation/reply",
        json={
            "persona": PERSONA,
            "personality": PERSONALITY,
            "scenario": SCENARIO,
            "messages": [],
            "userMessage": "이야기하고 싶어.",
            "turn": 1,
        },
    )
    assert response.status_code == 200
    assert response.json() == "차분히 이야기해 줘서 고마워."


def test_evaluate_returns_frontend_feedback_shape() -> None:
    response = client.post(
        "/api/conversation/evaluate",
        json={
            "persona": PERSONA,
            "personality": PERSONALITY,
            "scenario": SCENARIO,
            "messages": [],
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "score": 90,
        "goodPoint": "내 마음을 분명히 말했어요.",
        "betterPoint": "바라는 행동도 함께 말해 봐요.",
    }


def test_invalid_persona_is_rejected() -> None:
    response = client.post(
        "/api/conversation/suggest-scenarios",
        json={"personaId": "unknown", "personality": PERSONALITY},
    )
    assert response.status_code == 422


def test_reply_prompt_does_not_duplicate_current_user_message() -> None:
    prompt = reply_prompt(
        Persona.model_validate(PERSONA),
        PersonalityStyle.model_validate(PERSONALITY),
        Scenario.model_validate(SCENARIO),
        [],
        "이야기하고 싶어.",
        1,
    )
    assert prompt.count("이야기하고 싶어.") == 1


def test_selected_personality_is_used_in_scenario_and_reply_prompts() -> None:
    personality = PersonalityStyle.model_validate(PERSONALITY)
    scenario_text = scenario_prompt("parent", personality)
    reply_text = reply_prompt(
        Persona.model_validate(PERSONA),
        personality,
        Scenario.model_validate(SCENARIO),
        [],
        "오늘 시험을 못 봐서 속상해.",
        1,
    )

    assert "다정한" in scenario_text
    assert "감정을 먼저 다정하게 인정" in scenario_text
    assert "무슨 일이 있었는지" in reply_text
    assert "느끼는 감정" in reply_text
    assert "방금 말한 사건이나 표현을 구체적으로 짚고" in reply_text
    assert "감정을 자연스럽게 인정" in reply_text
    assert "현재 턴이 1/5이면 반드시 공감과 상황 파악만" in reply_text
    assert "현재 턴이 2/5 이상이고" in reply_text
    assert "상담자 '눈치코치'" in reply_text
    assert "상담자 정체성을 계속 유지하세요" in reply_text
    assert "상대가 할 법한 말 한 문장만 `상대: ...` 형식" in reply_text
    assert "가 아이에게 하는 말만 넣으세요" in reply_text
    assert "부탁·사과·거절 문장을 `상대:`로 잘못 표시하지 마세요" in reply_text
    assert "아이가 해야 할 정답, 추천 문장, 완성된 예시는 절대 먼저" in reply_text
    assert "그 실제 답변을 먼저 피드백" in reply_text
    assert "피드백 응답에서는 새 `상대: ...` 대사를 절대 만들지 마세요" in reply_text
    assert "가장 중요한 한 가지만" in reply_text
    assert "아이가 직접 한 번 더 말하게" in reply_text
    assert "사소한 말투를 더 다듬기 위해 다시 말하게 하지 말고" in reply_text
    assert "새 상대 반응이나 더 어려운 상황을 덧붙여" in reply_text
    assert "현재 턴이 5/5이면 새 질문이나 새 연습을 시작하지 말고" in reply_text
    assert "일반 예절 롤플레이를 진행하지 마세요" in reply_text
    assert "상담자 '눈치코치'가 아이에게" in scenario_text
    assert "약속을 지키지 못했을 때 먼저 인정" in scenario_text
    assert "필요한 예절 한 가지" in reply_text
    assert "무조건 양보하거나 참으라고 하지 말고" in reply_text
    assert "완성된 예시는 절대 먼저 만들지 마세요" in reply_text


def test_reply_prompt_includes_turn_and_history_for_roleplay_stage() -> None:
    messages = [
        {
            "id": "assistant-opening",
            "sender": "assistant",
            "text": "무슨 일이 있었는지 말해 줄래?",
        },
        {
            "id": "user-1",
            "sender": "user",
            "text": "엄마와 약속을 못 지켜서 미안하고 다시 믿어 줬으면 좋겠어.",
        },
        {
            "id": "assistant-1",
            "sender": "assistant",
            "text": "미안하고 다시 믿어 주길 바라는구나. 어떤 약속이었어?",
        },
    ]
    prompt = reply_prompt(
        Persona.model_validate(PERSONA),
        PersonalityStyle.model_validate(PERSONALITY),
        Scenario.model_validate(SCENARIO),
        [ChatMessage.model_validate(message) for message in messages],
        "게임을 끄기로 한 약속이었어.",
        2,
    )

    assert "현재 턴: 2/5" in prompt
    assert "미안하고 다시 믿어 주길 바라는구나" in prompt
    assert prompt.count("게임을 끄기로 한 약속이었어.") == 1


def test_evaluation_prompt_forbids_example_phrases() -> None:
    from app.prompts import evaluation_prompt

    prompt = evaluation_prompt(
        Persona.model_validate(PERSONA),
        PersonalityStyle.model_validate(PERSONALITY),
        Scenario.model_validate(SCENARIO),
        [],
    )

    assert "추천 문장" in prompt
    assert "그대로 따라 말할 예문을 넣지 마세요" in prompt
