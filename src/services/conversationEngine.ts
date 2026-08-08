import { scenarioPools } from '../data'
import type {
  ChatMessage,
  ConversationEngine,
  Feedback,
  Persona,
  PersonaId,
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

const getLocalReply = ({ persona, userMessage, turn }: ReplyContext) => {
  if (/미안|죄송/.test(userMessage)) {
    return '솔직하게 말해 줘서 고마워. 다음에는 어떻게 하면 좋을까?'
  }

  if (/고마|감사/.test(userMessage)) {
    return '그렇게 말해 주니 기분이 좋아! 한 가지 더 이야기해 볼래?'
  }

  const replies = [
    `${persona.name}에게 조금 더 자세히 말해 줄래?`,
    '응, 네 마음을 알 것 같아. 그래서 어떻게 하고 싶어?',
    '좋은 생각이야. 내가 도와줄 일도 있을까?',
    '알겠어. 네가 직접 말해 줘서 고마워.',
    '좋아, 우리 그렇게 해 보자!',
  ]

  return replies[Math.min(turn - 1, replies.length - 1)]
}

const getLocalFeedback = (
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
      : '피하지 않고 내 생각을 끝까지 말했어요.',
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
    scenario: Scenario,
    messages: ChatMessage[],
  ) {
    await wait(400)
    return getLocalFeedback(scenario, messages)
  },
}
