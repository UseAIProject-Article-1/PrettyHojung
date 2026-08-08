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
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
}

export interface Feedback {
  score: number
  goodPoint: string
  betterPoint: string
}

export interface ReplyContext {
  persona: Persona
  personality: PersonalityStyle
  scenario: Scenario
  messages: ChatMessage[]
  userMessage: string
  turn: number
}

export interface ConversationEngine {
  suggestScenarios: (
    personaId: PersonaId,
    personality: PersonalityStyle,
  ) => Promise<Scenario[]>
  reply: (context: ReplyContext) => Promise<string>
  evaluate: (
    persona: Persona,
    personality: PersonalityStyle,
    scenario: Scenario,
    messages: ChatMessage[],
  ) => Promise<Feedback>
}
