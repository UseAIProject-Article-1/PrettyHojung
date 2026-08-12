import type {
  ChatMessage,
  ConversationProgress,
  Feedback,
  FeedbackLevel,
  ScoreCriterion,
  ScoreCriterionId,
  ScoringInput,
  SessionRules,
} from '../types'

/**
 * All tunable numbers for turn limits, progress and scoring live here.
 * A backend can either override these values or replace `buildFeedback`
 * entirely; nothing else in the app hard-codes a percentage.
 */
export const sessionRules: SessionRules = {
  maxUserTurns: 5,
  minUserTurns: 1,
}

/** Every answer is worth this much of the progress bar. */
export const progressWeightPerTurn = 1

export const feedbackLevels: FeedbackLevel[] = [
  { id: 'great', label: '아주 잘했어요', emoji: '🌟', minScore: 85 },
  { id: 'good', label: '잘하고 있어요', emoji: '💪', minScore: 70 },
  { id: 'growing', label: '한 걸음 나아갔어요', emoji: '🌱', minScore: 0 },
]

interface CriterionRule {
  id: ScoreCriterionId
  label: string
  emoji: string
  /** Share of the final score, relative to the other rules. */
  weight: number
  /** Score when the child meets the rule; the miss case scores `floor`. */
  hit: number
  floor: number
  /** Decides whether the rule is met, from the child's own messages. */
  test: (context: CriterionContext) => boolean
  /** Shown on the feedback screen when this is the weakest rule. */
  advice: string
}

interface CriterionContext {
  userMessages: ChatMessage[]
  joinedText: string
  rules: SessionRules
}

const politeWords = /고마|감사|미안|죄송|주세요|주실|해도 될까|괜찮을까/
const feelingWords = /속상|기뻐|기쁘|슬퍼|슬프|걱정|무서|서운|좋았|힘들|부끄|긴장|화가/
const requestWords = /주세요|줄래|해도 될까|하고 싶|부탁|같이|도와/
const detailWords = /왜냐하면|그래서|때문에|어제|오늘|아까|처음|다음에/

const criterionRules: CriterionRule[] = [
  {
    id: 'opening',
    label: '먼저 말 걸기',
    emoji: '👋',
    weight: 1,
    hit: 100,
    floor: 40,
    test: ({ userMessages }) => userMessages.length > 0,
    advice: '먼저 한 마디만 건네 봐도 대화가 시작돼요.',
  },
  {
    id: 'feelings',
    label: '내 마음 말하기',
    emoji: '💗',
    weight: 2,
    hit: 100,
    floor: 45,
    test: ({ joinedText }) => feelingWords.test(joinedText),
    advice: '“나는 ~해서 속상했어”처럼 내 기분을 함께 말해 봐요.',
  },
  {
    id: 'request',
    label: '바라는 것 말하기',
    emoji: '🙌',
    weight: 2,
    hit: 100,
    floor: 45,
    test: ({ joinedText }) => requestWords.test(joinedText),
    advice: '내가 바라는 행동을 한 문장으로 분명하게 말해 봐요.',
  },
  {
    id: 'politeness',
    label: '고운 말 쓰기',
    emoji: '🌈',
    weight: 2,
    hit: 100,
    floor: 50,
    test: ({ joinedText }) => politeWords.test(joinedText),
    advice: '“고마워”, “미안해” 같은 말을 한 번 넣어 보면 좋아요.',
  },
  {
    id: 'detail',
    label: '이유 설명하기',
    emoji: '💡',
    weight: 1,
    hit: 100,
    floor: 45,
    test: ({ joinedText, userMessages }) =>
      detailWords.test(joinedText) ||
      userMessages.some((message) => message.text.trim().length >= 20),
    advice: '“왜냐하면 ~”을 붙여 이유도 알려 주면 더 잘 전해져요.',
  },
]

export const countUserTurns = (messages: ChatMessage[]) =>
  messages.filter((message) => message.sender === 'user').length

/** Single source of truth for the progress bar and the turn limit. */
export const getProgress = (
  messages: ChatMessage[],
  rules: SessionRules = sessionRules,
): ConversationProgress => {
  const maxTurns = Math.max(1, rules.maxUserTurns)
  const completedTurns = Math.min(countUserTurns(messages), maxTurns)
  const ratio = (completedTurns * progressWeightPerTurn) / (maxTurns * progressWeightPerTurn)

  return {
    completedTurns,
    maxTurns,
    remainingTurns: maxTurns - completedTurns,
    ratio,
    percent: Math.round(ratio * 100),
    isComplete: completedTurns >= maxTurns,
  }
}

export const getFeedbackLevel = (score: number): FeedbackLevel =>
  feedbackLevels.find((level) => score >= level.minScore) ??
  feedbackLevels[feedbackLevels.length - 1]

const scoreCriteria = (context: CriterionContext): ScoreCriterion[] =>
  criterionRules.map((rule) => {
    const achieved = rule.test(context)

    return {
      id: rule.id,
      label: rule.label,
      emoji: rule.emoji,
      score: achieved ? rule.hit : rule.floor,
      achieved,
    }
  })

/** Weighted average of the criteria, rounded to a whole percent. */
export const getOverallScore = (criteria: ScoreCriterion[]) => {
  const weightById = new Map(criterionRules.map((rule) => [rule.id, rule.weight]))
  const totalWeight = criteria.reduce(
    (sum, criterion) => sum + (weightById.get(criterion.id) ?? 1),
    0,
  )

  if (totalWeight === 0) return 0

  const weightedSum = criteria.reduce(
    (sum, criterion) => sum + criterion.score * (weightById.get(criterion.id) ?? 1),
    0,
  )

  return Math.round(weightedSum / totalWeight)
}

const buildGoodPoint = (criteria: ScoreCriterion[], hasAnswered: boolean) => {
  if (!hasAnswered) return '대화할 사람과 상황을 스스로 골랐어요.'

  const achieved = criteria.filter((criterion) => criterion.achieved)
  if (achieved.length === 0) return '어려운 상황에서도 끝까지 대답했어요.'

  return `${achieved.map((criterion) => criterion.label).join(', ')} 잘했어요.`
}

const buildBetterPoint = (criteria: ScoreCriterion[]) => {
  const missed = criterionRules.find(
    (rule) => criteria.find((criterion) => criterion.id === rule.id)?.achieved === false,
  )

  return missed?.advice ?? '지금처럼 내 마음과 부탁을 함께 말해 봐요.'
}

/**
 * Turns a finished conversation into a feedback card.
 * Swap this for a server call to move scoring to the backend; the return
 * shape is the API contract the feedback screen renders.
 */
export const buildFeedback = ({
  scenario,
  messages,
  rules,
}: ScoringInput): Feedback => {
  const userMessages = messages.filter((message) => message.sender === 'user')
  const context: CriterionContext = {
    userMessages,
    joinedText: userMessages.map((message) => message.text).join(' '),
    rules,
  }
  const criteria = scoreCriteria(context)
  const score = getOverallScore(criteria)

  return {
    score,
    level: getFeedbackLevel(score),
    criteria,
    progress: getProgress(messages, rules),
    goodPoint: buildGoodPoint(criteria, userMessages.length > 0),
    betterPoint: buildBetterPoint(criteria),
    example: scenario.samplePhrase,
  }
}
