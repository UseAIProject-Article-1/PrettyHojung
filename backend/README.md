# 눈치코치 FastAPI 백엔드

프론트엔드의 `ConversationEngine` 계약에 맞춘 APIM 기반 AI API입니다.

## 실행

Windows:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# .env의 APIM URL, 경로, 키를 실제 값으로 변경
uvicorn app.main:app --reload --port 8001
```

Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
# .env의 APIM URL, 경로, 키를 실제 값으로 변경
uvicorn app.main:app --reload --port 8001
```

전체 앱은 프로젝트 루트에서 `npm start`로 실행합니다. API 문서는 `http://localhost:8001/docs`에서 확인할 수 있습니다.

## API

- `GET /health`
- `POST /api/conversation/suggest-scenarios`
- `POST /api/conversation/reply`
- `POST /api/conversation/evaluate`

요청과 응답의 필드명은 프론트엔드 `src/types.ts`의 camelCase 타입과 같습니다.
`reply` 응답은 프론트엔드 계약에 맞춰 JSON 문자열로 반환됩니다.

`APIM_CHAT_URL`을 설정하면 해당 전체 URL을 사용합니다. 설정하지 않으면
`APIM_BASE_URL`과 `APIM_CHAT_PATH`를 합쳐 호출합니다. 기본 키 헤더는 `api-key`이며,
APIM 구성이 다르면 `APIM_KEY_HEADER`를 `Ocp-Apim-Subscription-Key` 또는
`Authorization`으로 변경할 수 있습니다.

## 테스트

```bash
python -m pip install -r requirements-dev.txt
pytest
```

APIM 키는 브라우저나 `VITE_*` 환경 변수에 넣지 말고 백엔드의 `.env`에만 저장하세요.
