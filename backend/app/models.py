from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


PersonaId = Literal["parent", "teacher", "close-friend", "new-friend", "sibling"]
PersonalityId = Literal["kind", "calm", "active", "direct"]
NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class Persona(ApiModel):
    id: PersonaId
    label: NonEmptyText
    emoji: NonEmptyText
    name: NonEmptyText
    gender: Literal["여성", "남성"]
    relationship: NonEmptyText
    personality: NonEmptyText
    tone: NonEmptyText
    color: NonEmptyText


class PersonalityStyle(ApiModel):
    id: PersonalityId
    label: NonEmptyText
    emoji: NonEmptyText
    description: NonEmptyText


class Scenario(ApiModel):
    id: NonEmptyText
    persona_id: PersonaId = Field(alias="personaId")
    emoji: NonEmptyText
    title: NonEmptyText
    hint: NonEmptyText
    opening_line: NonEmptyText = Field(alias="openingLine")


class ChatMessage(ApiModel):
    id: NonEmptyText
    sender: Literal["user", "assistant"]
    text: NonEmptyText


class Feedback(ApiModel):
    score: int = Field(ge=0, le=100)
    good_point: NonEmptyText = Field(alias="goodPoint")
    better_point: NonEmptyText = Field(alias="betterPoint")


class SuggestScenariosRequest(ApiModel):
    persona_id: PersonaId = Field(alias="personaId")
    personality: PersonalityStyle


class ReplyRequest(ApiModel):
    persona: Persona
    personality: PersonalityStyle
    scenario: Scenario
    messages: list[ChatMessage] = Field(max_length=20)
    user_message: NonEmptyText = Field(alias="userMessage", max_length=1000)
    turn: int = Field(ge=1, le=5)


class EvaluateRequest(ApiModel):
    persona: Persona
    personality: PersonalityStyle
    scenario: Scenario
    messages: list[ChatMessage] = Field(max_length=20)


class ScenarioList(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenarios: list[Scenario] = Field(min_length=5, max_length=5)
