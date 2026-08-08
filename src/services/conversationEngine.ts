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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function requestApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let detail = `서버 요청에 실패했습니다. (${response.status})`
    try {
      const errorBody = await response.json() as { detail?: string }
      if (errorBody.detail) detail = errorBody.detail
    } catch {
      // Keep the status-based message when the server did not return JSON.
    }
    throw new Error(detail)
  }

  return response.json() as Promise<T>
}

export const conversationEngine: ConversationEngine = {
  suggestScenarios(personaId: PersonaId, personality: PersonalityStyle) {
    return requestApi<Scenario[]>('/api/conversation/suggest-scenarios', {
      personaId,
      personality,
    })
  },

  reply(context: ReplyContext) {
    return requestApi<string>('/api/conversation/reply', context)
  },

  evaluate(
    persona: Persona,
    personality: PersonalityStyle,
    scenario: Scenario,
    messages: ChatMessage[],
  ) {
    return requestApi<Feedback>('/api/conversation/evaluate', {
      persona,
      personality,
      scenario,
      messages,
    })
  },
}
