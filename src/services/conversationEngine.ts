import { scenarioPools } from '../data'
import type {
  ChatMessage,
  ConversationEngine,
  Feedback,
  Persona,
  PersonaId,
  PersonalityStyle,
  ReplyContext,
  Scenario,
} from '../types'

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

const shuffle = <T,>(items: T[]) =>
  [...items]
    .map((item) => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item)

const getLocalReply = ({
  personality,
  userMessage,
  turn,
}: ReplyContext) => {
  if (/미안|죄송/.test(userMessage)) {
    return '솔직하게 말해 줘서 고마워. 다음에는 어떻게 하면 좋을까?'
  }

  if (/고마|감사/.test(userMessage)) {
    return '그렇게 말해 주니 기분이 좋아! 한 가지 더 이야기해 볼래?'
  }

  const repliesByStyle = {
    kind: [
      '그랬구나. 네 마음을 말해 줘서 고마워.',
      '응, 충분히 이해돼. 내가 어떻게 해 주면 좋을까?',
      '좋은 생각이야. 천천히 더 말해 줘도 괜찮아.',
      '네가 편해질 수 있게 같이 해 보자.',
      '좋아. 우리 그렇게 약속하자!',
    ],
    calm: [
      '알겠어. 한 가지씩 천천히 이야기해 보자.',
      '그럼 지금 가장 필요한 건 무엇일까?',
      '네 생각을 잘 들었어. 방법을 같이 정해 볼까?',
      '응, 그 방법이라면 차근차근 해 볼 수 있겠어.',
      '좋아. 정한 대로 해 보자.',
    ],
    active: [
      '좋아! 조금 더 자세히 알려 줘!',
      '그랬구나! 그럼 다음에는 어떻게 하고 싶어?',
      '좋은데? 내가 도와줄 일도 있을까?',
      '알겠어! 바로 같이 해 보자.',
      '좋아, 약속! 멋지게 말했어!',
    ],
    direct: [
      '알겠어. 그래서 내가 무엇을 해 주면 돼?',
      '네가 원하는 걸 한 문장으로 말해 줄래?',
      '좋아. 그 방법이 필요한 이유도 알려 줘.',
      '분명하게 말해 줘서 이해했어.',
      '좋아. 다음부터는 그렇게 할게.',
    ],
  } satisfies Record<PersonalityStyle['id'], string[]>
  const replies = repliesByStyle[personality.id]

  return replies[Math.min(turn - 1, replies.length - 1)]
}

const getLocalFeedback = (
  personality: PersonalityStyle,
  scenario: Scenario,
  messages: ChatMessage[],
): Feedback => {
  const userMessages = messages.filter((message) => message.sender === 'user')
  const joinedText = userMessages.map((message) => message.text).join(' ')
  const usedKindWords = /고마|미안|주세요|줄래|할까|어때/.test(joinedText)
  const score = Math.min(98, 72 + userMessages.length * 4 + (usedKindWords ? 6 : 0))

  return {
    score,
    goodPoint: userMessages.length === 0
      ? '대화를 시작할 사람과 상황을 스스로 골랐어요.'
      : usedKindWords
      ? '상대를 생각하는 말로 내 마음을 잘 전했어요.'
      : `${personality.label} 상대에게 피하지 않고 내 생각을 말했어요.`,
    betterPoint: '내가 바라는 행동을 한 문장으로 더 분명하게 말해 봐요.',
    example: scenario.samplePhrase,
  }
}

// OpenAI calls should live behind a server endpoint; this client only consumes the engine contract.
export const conversationEngine: ConversationEngine = {
  async suggestScenarios(personaId: PersonaId) {
    await wait(350)
    return shuffle(scenarioPools[personaId]).slice(0, 5)
  },

  async reply(context: ReplyContext) {
    await wait(550)
    return getLocalReply(context)
  },

  async evaluate(
    _persona: Persona,
    personality: PersonalityStyle,
    scenario: Scenario,
    messages: ChatMessage[],
  ) {
    await wait(400)
    return getLocalFeedback(personality, scenario, messages)
  },
}
