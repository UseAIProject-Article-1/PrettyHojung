# 눈치코치

초등학교 3~6학년 어린이가 부모님, 선생님, 친구와의 대화를 짧게 연습하는 프론트엔드 MVP입니다. 현재는 로컬 목 AI 엔진으로 동작하며, 같은 인터페이스에 서버 기반 OpenAI 구현을 연결할 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

```bash
npm run build
npm run lint
npm run preview
```

## 화면 흐름

1. **대화 상대 선택**: 부모님, 선생님, 친한 친구, 새 친구, 형제자매 중 한 명을 선택합니다.
2. **인물·성향 설정**: 이름, 성별, 관계, 기본 성격을 확인하고 `다정한`, `차분한`, `활발한`, `솔직한` 성향 중 하나를 고릅니다.
3. **상황 선택**: 선택한 인물에 맞는 상황 5개를 무작위로 받고 하나를 선택합니다.
4. **대화**: 선택한 성향을 반영한 AI가 첫 말을 건넵니다. 사용자는 자유롭게 답하며 최대 5회까지 대화하거나 `대화 종료`를 누를 수 있습니다.
5. **피드백**: 점수(%), 항목별 달성도, 좋았던 점, 개선점, 추천 문장을 확인합니다.

## OpenAI 연동

`src/services/conversationEngine.ts`의 `ConversationEngine` 구현만 교체하면 화면 코드를 수정하지 않고 실제 AI를 연결할 수 있습니다.

- `loadRules`: 답변 횟수 제한 등 세션 규칙 조회 (선택 구현, 미구현 시 로컬 기본값 사용)
- `suggestScenarios`: 선택한 페르소나를 바탕으로 상황 5개 생성
- `reply`: 페르소나, 상황, 이전 메시지, 현재 턴을 전달해 다음 답변 생성
- `evaluate`: `ScoringInput`을 받아 `Feedback` 생성

OpenAI API 키를 `VITE_*` 환경 변수나 브라우저 코드에 넣으면 사용자에게 노출됩니다. 별도 서버의 `/api/conversation/*` 엔드포인트에서 OpenAI를 호출하고, 프론트엔드 엔진은 해당 서버만 호출하도록 구성해야 합니다. 응답은 `Scenario`, `Feedback` 타입에 맞게 구조화해 검증하세요.

## 점수·진척도 수정하기

퍼센트와 진척도에 관한 값은 모두 `src/services/scoring.ts` 한 곳에 모여 있습니다. 화면 컴포넌트에는 계산식이 없으므로 이 파일만 고치면 됩니다.

| 바꾸고 싶은 것 | 수정 위치 |
| --- | --- |
| 답변 가능 횟수 | `sessionRules.maxUserTurns` |
| 진척도 계산 방식 | `progressWeightPerTurn`, `getProgress` |
| 점수 항목·배점 | `criterionRules`의 `weight`, `hit`, `floor`, `test` |
| 등급 구간(🌟/💪/🌱) | `feedbackLevels`의 `minScore` |
| 채점 로직 전체 | `buildFeedback` |

백엔드로 채점을 옮길 때는 `buildFeedback` 호출을 서버 요청으로 바꾸면 됩니다. 서버는 `ScoringInput`을 받아 `Feedback`(`score`, `level`, `criteria`, `progress`, `goodPoint`, `betterPoint`, `example`)을 그대로 반환하면 화면이 수정 없이 렌더링합니다. 답변 횟수만 서버에서 제어하려면 `loadRules`로 `SessionRules`를 내려 주세요.

## 기술 구성

- React 19
- TypeScript
- Vite
- CSS 반응형 UI
- Oxlint

별도 UI 라이브러리는 사용하지 않으며, 제공된 토끼 마스코트는 `tools/extract-mascot.ps1`로 배경을 제거(누끼)해 투명 PNG로 사용합니다.

## 작업 브랜치 자동 동기화

이 작업 공간은 `justboom03-nunchicoach-ui-mvp` 브랜치만 자동 동기화합니다. `tools/auto-sync.ps1`은 변경이 60초 동안 멈추면 자동 커밋하고 같은 원격 브랜치로 푸시합니다. `.env`, 인증서, 키, credential·secret 파일이 감지되면 자동 커밋하지 않습니다.
