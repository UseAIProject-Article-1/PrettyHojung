import type { Persona, PersonaId, PersonalityStyle, Scenario } from './types'

export const personalityStyles: PersonalityStyle[] = [
  {
    id: 'kind',
    label: '다정한',
    emoji: '💗',
    description: '내 마음을 잘 들어주고 따뜻하게 대답해요.',
  },
  {
    id: 'calm',
    label: '차분한',
    emoji: '🌙',
    description: '서두르지 않고 천천히 생각하며 말해요.',
  },
  {
    id: 'active',
    label: '활발한',
    emoji: '⚡',
    description: '반응이 크고 먼저 질문하며 대화를 이끌어요.',
  },
  {
    id: 'direct',
    label: '솔직한',
    emoji: '🎯',
    description: '생각을 돌려 말하지 않고 분명하게 표현해요.',
  },
]

export const personas: Persona[] = [
  {
    id: 'parent',
    label: '부모님',
    emoji: '👩',
    name: '지은',
    gender: '여성',
    relationship: '엄마',
    personality: '걱정이 많지만 내 이야기를 끝까지 들어줘요.',
    tone: '따뜻하고 차분해요',
    color: '#f8b7c7',
  },
  {
    id: 'teacher',
    label: '선생님',
    emoji: '👨‍🏫',
    name: '민준',
    gender: '남성',
    relationship: '담임 선생님',
    personality: '질문을 반기고, 순서대로 친절히 설명해 줘요.',
    tone: '또박또박 다정해요',
    color: '#9fc7f3',
  },
  {
    id: 'close-friend',
    label: '친한 친구',
    emoji: '🧒',
    name: '유나',
    gender: '여성',
    relationship: '같은 반 단짝',
    personality: '장난을 좋아하고 솔직한 이야기를 잘 들어줘요.',
    tone: '활발하고 편안해요',
    color: '#f5cf70',
  },
  {
    id: 'new-friend',
    label: '새 친구',
    emoji: '👦',
    name: '하람',
    gender: '남성',
    relationship: '처음 만난 반 친구',
    personality: '조금 수줍지만 먼저 웃어 주면 편하게 대답해요.',
    tone: '짧고 조심스러워요',
    color: '#9edfc4',
  },
  {
    id: 'sibling',
    label: '형제자매',
    emoji: '👧',
    name: '서아',
    gender: '여성',
    relationship: '두 살 위 누나',
    personality: '내 편이지만 가끔 물건을 허락 없이 빌려 가요.',
    tone: '장난스럽고 솔직해요',
    color: '#c6b2ed',
  },
]

const fallbackScenarioContent: Record<
  PersonaId,
  Array<Pick<Scenario, 'id' | 'emoji' | 'title' | 'hint' | 'openingLine'>>
> = {
  parent: [
    { id: 'parent-broken-promise', emoji: '⏰', title: '부모님과 한 약속을 지키지 못했어요', hint: '사실을 숨기지 않고 먼저 인정해요', openingLine: '약속을 지키지 못해서 마음이 쓰였구나. 어떤 약속이었고 부모님께 어떻게 말했는지 알려 줄래?' },
    { id: 'parent-screen-time', emoji: '📱', title: '휴대폰 사용 때문에 다퉜어요', hint: '내 생각과 원하는 규칙을 차분히 설명해요', openingLine: '휴대폰 문제로 부모님과 의견이 달랐구나. 무슨 일이 있었고 서로 어떻게 말했는지 들려줄래?' },
    { id: 'parent-allowance', emoji: '💰', title: '사고 싶은 물건을 허락받고 싶어요', hint: '필요한 이유를 말하고 답을 기다려요', openingLine: '사고 싶은 물건이 있는데 어떻게 부탁할지 고민되는구나. 왜 필요한지와 지금 생각한 부탁 방법을 알려 줄래?' },
    { id: 'parent-school-result', emoji: '📝', title: '시험 결과를 말하기가 걱정돼요', hint: '결과와 앞으로의 계획을 솔직히 말해요', openingLine: '시험 결과를 부모님께 알리는 일이 걱정되는구나. 어떤 결과였고 지금까지 어떻게 이야기했는지 알려 줄래?' },
    { id: 'parent-private-space', emoji: '🚪', title: '내 물건을 허락 없이 보셨어요', hint: '화내기 전에 불편한 점과 바라는 행동을 말해요', openingLine: '내 물건을 허락 없이 봐서 불편했구나. 그때 어떤 일이 있었고 부모님께 마음을 어떻게 전했는지 들려줄래?' },
  ],
  teacher: [
    { id: 'teacher-question', emoji: '🙋', title: '수업 내용을 다시 질문하고 싶어요', hint: '순서를 기다린 뒤 모르는 부분을 정확히 말해요', openingLine: '모르는 내용을 다시 질문하고 싶구나. 어느 부분이 어려웠고 선생님께 어떻게 질문해 봤는지 알려 줄래?' },
    { id: 'teacher-late-homework', emoji: '📚', title: '숙제를 제때 내지 못했어요', hint: '핑계보다 사실과 제출 계획을 먼저 말해요', openingLine: '숙제를 제때 내지 못해서 걱정되는구나. 무슨 일이 있었고 선생님께 어떻게 설명했는지 들려줄래?' },
    { id: 'teacher-unfair-feeling', emoji: '⚖️', title: '선생님 말씀이 억울하게 느껴졌어요', hint: '사람을 탓하기보다 있었던 일을 차분히 확인해요', openingLine: '선생님 말씀을 듣고 억울한 마음이 들었구나. 어떤 상황이었고 그때 어떻게 반응했는지 알려 줄래?' },
    { id: 'teacher-class-turn', emoji: '🗣️', title: '수업 중 말할 차례를 놓쳤어요', hint: '다른 사람의 차례를 지키며 참여 방법을 물어요', openingLine: '말하고 싶었는데 기회를 놓쳐 답답했겠구나. 그때 어떻게 행동했고 다음에는 어떻게 해 보고 싶은지 알려 줄래?' },
    { id: 'teacher-help-request', emoji: '🆘', title: '학교에서 도움을 요청하고 싶어요', hint: '도움이 필요한 일과 원하는 도움을 구체적으로 말해요', openingLine: '혼자 해결하기 어려운 일이 있었구나. 무슨 도움을 받고 싶고 선생님께 어떻게 말해 봤는지 들려줄래?' },
  ],
  'close-friend': [
    { id: 'friend-hurtful-joke', emoji: '😞', title: '친구의 장난 때문에 서운했어요', hint: '있었던 일과 내 감정, 멈춰 주길 바라는 행동을 말해요', openingLine: '친한 친구의 장난 때문에 서운했구나. 어떤 장난이었고 네 마음을 어떻게 전달했는지 알려 줄래?' },
    { id: 'friend-secret', emoji: '🤫', title: '친구가 내 비밀을 말했어요', hint: '비밀의 경계를 분명히 하고 다시 바라는 행동을 말해요', openingLine: '믿고 말한 비밀이 알려져 속상했구나. 무슨 일이 있었고 친구에게 어떻게 이야기했는지 들려줄래?' },
    { id: 'friend-borrowed-item', emoji: '✏️', title: '친구가 내 물건을 돌려주지 않아요', hint: '물건을 돌려받고 싶은 때를 분명하게 부탁해요', openingLine: '빌려준 물건을 받지 못해 불편하구나. 어떤 물건이고 지금까지 친구에게 어떻게 말했는지 알려 줄래?' },
    { id: 'friend-game-conflict', emoji: '🎮', title: '게임 규칙 때문에 친구와 싸웠어요', hint: '서로의 말을 듣고 함께 정한 규칙을 확인해요', openingLine: '게임 규칙 때문에 서로 기분이 상했구나. 어떻게 다투게 됐고 너는 어떤 말과 행동을 했는지 들려줄래?' },
    { id: 'friend-apology', emoji: '🙏', title: '내 실수로 친구가 화났어요', hint: '무엇을 잘못했는지 인정하고 고칠 행동을 보여 줘요', openingLine: '네 실수로 친구가 화가 난 상황이구나. 무슨 일이 있었고 지금까지 어떻게 사과했는지 알려 줄래?' },
  ],
  'new-friend': [
    { id: 'new-friend-greeting', emoji: '👋', title: '새 친구에게 먼저 인사하고 싶어요', hint: '편하게 인사하고 상대의 반응을 기다려요', openingLine: '새 친구와 친해지고 싶은데 첫마디가 고민되는구나. 지금까지 어떤 행동을 해 봤는지 알려 줄래?' },
    { id: 'new-friend-join-play', emoji: '⚽', title: '같이 놀자고 말하고 싶어요', hint: '함께하자고 제안하되 선택을 존중해요', openingLine: '새 친구와 같이 놀고 싶구나. 어떤 놀이인지와 어떻게 제안해 봤는지 들려줄래?' },
    { id: 'new-friend-rejection', emoji: '🌧️', title: '새 친구가 같이 놀기 싫다고 했어요', hint: '거절을 존중하고 내 감정은 차분히 정리해요', openingLine: '같이 놀자는 제안을 거절당해 서운했구나. 그때 친구와 너는 각각 어떻게 말하고 행동했는지 알려 줄래?' },
    { id: 'new-friend-misunderstanding', emoji: '💭', title: '새 친구와 말이 잘못 전해졌어요', hint: '짐작으로 단정하지 말고 뜻을 다시 확인해요', openingLine: '서로의 말이 다르게 전해진 것 같구나. 어떤 말을 주고받았고 너는 어떻게 확인했는지 들려줄래?' },
    { id: 'new-friend-boundary', emoji: '🛑', title: '새 친구가 불편한 부탁을 했어요', hint: '불편한 부탁은 분명히 거절하고 필요하면 도움을 구해요', openingLine: '새 친구의 부탁이 불편하게 느껴졌구나. 어떤 부탁이었고 그때 어떻게 대답했는지 알려 줄래?' },
  ],
  sibling: [
    { id: 'sibling-borrowed-item', emoji: '🧸', title: '형제자매가 내 물건을 허락 없이 썼어요', hint: '화를 내기 전에 허락받아야 하는 이유를 말해요', openingLine: '내 물건을 허락 없이 사용해서 화가 났구나. 어떤 일이 있었고 그때 어떻게 말하고 행동했는지 알려 줄래?' },
    { id: 'sibling-turn', emoji: '🔄', title: '서로 먼저 하겠다고 다퉜어요', hint: '차례를 정하고 정한 약속을 함께 지켜요', openingLine: '누가 먼저 할지를 두고 다퉜구나. 어떤 상황이었고 차례를 정하려고 무엇을 해 봤는지 들려줄래?' },
    { id: 'sibling-room', emoji: '🚪', title: '내 방에 마음대로 들어왔어요', hint: '사생활의 경계와 바라는 행동을 분명히 말해요', openingLine: '허락 없이 방에 들어와 불편했구나. 그때 어떤 일이 있었고 네 마음을 어떻게 전달했는지 알려 줄래?' },
    { id: 'sibling-teasing', emoji: '😣', title: '계속 놀려서 화가 났어요', hint: '놀림을 멈춰 달라고 분명히 말하고 맞서 놀리지 않아요', openingLine: '계속되는 놀림 때문에 화가 났구나. 어떤 말이 오갔고 너는 어떻게 반응했는지 들려줄래?' },
    { id: 'sibling-apology', emoji: '🤝', title: '싸운 뒤에 화해하고 싶어요', hint: '내 잘못을 먼저 돌아보고 앞으로 바꿀 행동을 말해요', openingLine: '싸운 뒤에 다시 잘 지내고 싶은 마음이 있구나. 왜 싸웠고 서로에게 어떤 말과 행동을 했는지 알려 줄래?' },
  ],
}

export function getFallbackScenarios(personaId: PersonaId): Scenario[] {
  return fallbackScenarioContent[personaId].map((scenario) => ({
    ...scenario,
    personaId,
  }))
}
