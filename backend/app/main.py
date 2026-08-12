from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .models import (
    EvaluateRequest,
    Feedback,
    ReplyRequest,
    Scenario,
    SuggestScenariosRequest,
)
from .service import (
    ConfigurationError,
    ConversationService,
    InvalidAIResponseError,
    UpstreamAIError,
)


def get_conversation_service() -> ConversationService:
    return ConversationService(get_settings())


ServiceDependency = Annotated[ConversationService, Depends(get_conversation_service)]

app = FastAPI(
    title="눈치코치 API",
    version="1.0.0",
    description="초등학생 대화 연습을 위한 APIM 기반 FastAPI 백엔드",
)

startup_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=startup_settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


def raise_http_error(error: RuntimeError) -> None:
    if isinstance(error, ConfigurationError):
        raise HTTPException(status_code=503, detail=str(error)) from error
    if isinstance(error, InvalidAIResponseError):
        raise HTTPException(status_code=502, detail=str(error)) from error
    if isinstance(error, UpstreamAIError):
        raise HTTPException(status_code=502, detail=str(error)) from error
    raise HTTPException(status_code=502, detail="AI 서비스 요청에 실패했습니다.") from error


@app.post(
    "/api/conversation/suggest-scenarios",
    response_model=list[Scenario],
    response_model_by_alias=True,
    tags=["conversation"],
)
async def suggest_scenarios(
    request: SuggestScenariosRequest,
    service: ServiceDependency,
) -> list[Scenario]:
    try:
        return await service.suggest_scenarios(
            request.persona_id,
            request.personality,
        )
    except (ConfigurationError, UpstreamAIError, InvalidAIResponseError) as error:
        raise_http_error(error)


@app.post(
    "/api/conversation/reply",
    response_model=str,
    tags=["conversation"],
)
async def reply(request: ReplyRequest, service: ServiceDependency) -> str:
    try:
        return await service.reply(
            request.persona,
            request.personality,
            request.scenario,
            request.messages,
            request.user_message,
            request.turn,
        )
    except (ConfigurationError, UpstreamAIError, InvalidAIResponseError) as error:
        raise_http_error(error)


@app.post(
    "/api/conversation/evaluate",
    response_model=Feedback,
    response_model_by_alias=True,
    tags=["conversation"],
)
async def evaluate(request: EvaluateRequest, service: ServiceDependency) -> Feedback:
    try:
        return await service.evaluate(
            request.persona,
            request.personality,
            request.scenario,
            request.messages,
        )
    except (ConfigurationError, UpstreamAIError, InvalidAIResponseError) as error:
        raise_http_error(error)


frontend_dist = Path(__file__).resolve().parents[2] / "dist"
if frontend_dist.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=frontend_dist, html=True),
        name="frontend",
    )
