export type ViewMode = 'setup' | 'chat' | 'feedback'

export type PersonaId = 'parent' | 'teacher' | 'close-friend' | 'new-friend' | 'sibling'
export type PersonalityId = 'kind' | 'calm' | 'active' | 'direct'

export interface Persona {
  id: PersonaId
  label: string
  emoji: string
  name: string
  gender: '여성' | '남성'
  relationship: string
  personality: string
  tone: string
  color: string
}

export interface PersonalityStyle {
  id: PersonalityId
  label: string
  emoji: string
  description: string
}

export interface Scenario {
  id: string
  personaId: PersonaId
  emoji: string
  title: string
  hint: string
  openingLine: string
  samplePhrase: string
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
}

/** How many answers a child gets, and how few still count as a real attempt. */
export interface SessionRules {
  maxUserTurns: number
  minUserTurns: number
}

/** Turn-by-turn progress, derived in one place so UI and scoring never disagree. */
export interface ConversationProgress {
  completedTurns: number
  maxTurns: number
  remainingTurns: number
  /** 0 to 1. */
  ratio: number
  /** 0 to 100, already rounded for display. */
  percent: number
  isComplete: boolean
}

export type ScoreCriterionId =
  | 'opening'
  | 'feelings'
  | 'request'
  | 'politeness'
  | 'detail'

/** One scored skill. A backend can send these verbatim instead of scoring locally. */
export interface ScoreCriterion {
  id: ScoreCriterionId
  label: string
  emoji: string
  /** 0 to 100. */
  score: number
  achieved: boolean
}

export type FeedbackLevelId = 'great' | 'good' | 'growing'

export interface FeedbackLevel {
  id: FeedbackLevelId
  label: string
  emoji: string
  /** Lowest overall score that still reaches this band. */
  minScore: number
}

export interface Feedback {
  /** 0 to 100. */
  score: number
  level: FeedbackLevel
  criteria: ScoreCriterion[]
  progress: ConversationProgress
  goodPoint: string
  betterPoint: string
  example: string
}

export interface ReplyContext {
  persona: Persona
  personality: PersonalityStyle
  scenario: Scenario
  messages: ChatMessage[]
  userMessage: string
  turn: number
}

/** Everything the scorer needs. Matches the payload a server endpoint would receive. */
export interface ScoringInput {
  persona: Persona
  personality: PersonalityStyle
  scenario: Scenario
  messages: ChatMessage[]
  rules: SessionRules
}

export interface ConversationEngine {
  /**
   * Session limits. Implement this on the server so turn counts can change
   * without a frontend release; the client falls back to the local defaults.
   */
  loadRules?: () => Promise<SessionRules>
  suggestScenarios: (personaId: PersonaId) => Promise<Scenario[]>
  reply: (context: ReplyContext) => Promise<string>
  evaluate: (input: ScoringInput) => Promise<Feedback>
}
