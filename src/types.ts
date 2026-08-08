export type ViewMode = 'setup' | 'chat' | 'feedback'

export type PersonaId = 'parent' | 'teacher' | 'close-friend' | 'new-friend' | 'sibling'

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

export interface Feedback {
  score: number
  goodPoint: string
  betterPoint: string
  example: string
}

export interface ReplyContext {
  persona: Persona
  scenario: Scenario
  messages: ChatMessage[]
  userMessage: string
  turn: number
}

export interface ConversationEngine {
  suggestScenarios: (personaId: PersonaId) => Promise<Scenario[]>
  reply: (context: ReplyContext) => Promise<string>
  evaluate: (
    persona: Persona,
    scenario: Scenario,
    messages: ChatMessage[],
  ) => Promise<Feedback>
}
