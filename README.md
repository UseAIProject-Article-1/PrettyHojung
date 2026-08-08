# 눈치코치

초등학교 3~6학년 어린이가 부모님, 선생님, 친구와의 대화를 짧게 연습하는 서비스입니다. 모든 상황 생성, 대화, 평가는 FastAPI 백엔드를 거쳐 APIM의 AI 모델로 처리합니다.

## 실행

Windows와 Linux 모두 프로젝트 루트에서 Python 가상환경을 활성화한 뒤 실행합니다.

```bash
npm install
python -m pip install -r backend/requirements.txt
npm start
```

`npm start`는 프론트를 빌드하고 FastAPI가 정적 파일과 API를 함께 `http://localhost:8001`에서 제공합니다.
개발 모드에서는 터미널 두 개에서 `npm run backend`와 `npm run dev`를 각각 실행합니다.

## 화면 흐름

1. **대화 상대 선택**: 부모님, 선생님, 친한 친구, 새 친구, 형제자매 중 한 명을 선택합니다.
2. **인물·성향 설정**: 이름, 성별, 관계, 기본 성격을 확인하고 `다정한`, `차분한`, `활발한`, `솔직한` 성향 중 하나를 고릅니다.
3. **상황 선택**: 선택한 인물에 맞는 상황 5개를 무작위로 받고 하나를 선택합니다.
4. **대화**: 선택한 성향을 반영한 AI가 첫 말을 건넵니다. 사용자는 자유롭게 답하며 최대 5회까지 대화하거나 `대화 종료`를 누를 수 있습니다.
5. **피드백**: 점수(%), 좋았던 점, 개선점을 확인합니다.

## APIM 연동

- `suggestScenarios`: 선택한 페르소나를 바탕으로 상황 5개 생성
- `reply`: 페르소나, 상황, 이전 메시지, 현재 턴을 전달해 다음 답변 생성
- `evaluate`: 전체 대화를 분석해 점수와 피드백 생성

APIM 설정은 `backend/.env`에만 저장합니다. 프론트엔드는 `/api/conversation/*`만 호출하며 APIM 키를 알 수 없습니다.

## 기술 구성

- React 19
- TypeScript
- Vite
- FastAPI
- APIM Chat Completions
- CSS 반응형 UI
- Oxlint

별도 UI 라이브러리는 사용하지 않으며, 제공된 토끼 마스코트와 학교 배경을 웹용으로 잘라내고 압축해 사용합니다.
