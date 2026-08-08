import { useEffect, useState } from 'react'
import './App.css'
import { ChatScreen } from './components/ChatScreen'
import { FeedbackScreen } from './components/FeedbackScreen'
import { SetupScreen } from './components/SetupScreen'
import bunnyGuide from './assets/nunchi/bunny-doodle.svg'
import { personas, personalityStyles } from './data'
import { conversationEngine } from './services/conversationEngine'
import type {
  ChatMessage,
  Feedback,
  Persona,
  PersonalityStyle,
  Scenario,
  ViewMode,
} from './types'

const MAX_USER_TURNS = 5

function App() {
  const [view, setView] = useState<ViewMode>('setup')
  const [persona, setPersona] = useState<Persona>(personas[0])
  const [personality, setPersonality] = useState<PersonalityStyle>(
    personalityStyles[0],
  )
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true)
  const [isThinking, setIsThinking] = useState(false)

  useEffect(() => {
    let isCurrent = true
    setIsLoadingScenarios(true)
    conversationEngine.suggestScenarios(persona.id).then((suggestions) => {
      if (!isCurrent) return
      setScenarios(suggestions)
      setIsLoadingScenarios(false)
    })

    return () => {
      isCurrent = false
    }
  }, [persona])

  const userTurnCount = messages.filter(
    (message) => message.sender === 'user',
  ).length

  const selectPersona = (nextPersona: Persona) => {
    setPersona(nextPersona)
    setSelectedScenario(null)
  }

  const startConversation = () => {
    if (!selectedScenario) return
    setMessages([
      {
        id: 'opening',
        sender: 'assistant',
        text: selectedScenario.openingLine,
      },
    ])
    setFeedback(null)
    setView('chat')
  }

  const finishConversation = async (finalMessages = messages) => {
    if (!selectedScenario || isThinking) return
    setIsThinking(true)
    const result = await conversationEngine.evaluate(
      persona,
      personality,
      selectedScenario,
      finalMessages,
    )
    setFeedback(result)
    setIsThinking(false)
    setView('feedback')
  }

  const sendMessage = async (text: string) => {
    const trimmedText = text.trim()
    if (
      !selectedScenario ||
      !trimmedText ||
      isThinking ||
      userTurnCount >= MAX_USER_TURNS
    ) {
      return
    }

    const turn = userTurnCount + 1
    const userMessage: ChatMessage = {
      id: `user-${turn}-${Date.now()}`,
      sender: 'user',
      text: trimmedText,
    }
    const messagesWithUser = [...messages, userMessage]
    setMessages(messagesWithUser)
    setIsThinking(true)

    const reply = await conversationEngine.reply({
      persona,
      personality,
      scenario: selectedScenario,
      messages: messagesWithUser,
      userMessage: userMessage.text,
      turn,
    })
    const completedMessages: ChatMessage[] = [
      ...messagesWithUser,
      {
        id: `assistant-${turn}-${Date.now()}`,
        sender: 'assistant',
        text: reply,
      },
    ]
    setMessages(completedMessages)

    if (turn === MAX_USER_TURNS) {
      const result = await conversationEngine.evaluate(
        persona,
        personality,
        selectedScenario,
        completedMessages,
      )
      setFeedback(result)
      setIsThinking(false)
      setView('feedback')
      return
    }

    setIsThinking(false)
  }

  const reset = () => {
    setSelectedScenario(null)
    setMessages([])
    setFeedback(null)
    setView('setup')
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="logo" type="button" onClick={reset}>
          <span aria-hidden="true">
            <img src={bunnyGuide} alt="" />
          </span>
          <strong>눈치코치</strong>
        </button>
        <div className="steps" aria-label="진행 단계">
          <span className={view === 'setup' ? 'active' : 'done'}>1</span>
          <i />
          <span className={view === 'chat' ? 'active' : view === 'feedback' ? 'done' : ''}>2</span>
          <i />
          <span className={view === 'feedback' ? 'active' : ''}>3</span>
        </div>
      </header>

      <main>
        {view === 'setup' && (
          <SetupScreen
            personas={personas}
            persona={persona}
            personalityStyles={personalityStyles}
            personality={personality}
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            isLoading={isLoadingScenarios}
            onPersonaSelect={selectPersona}
            onPersonalitySelect={setPersonality}
            onScenarioSelect={setSelectedScenario}
            onStart={startConversation}
          />
        )}
        {view === 'chat' && selectedScenario && (
          <ChatScreen
            persona={persona}
            personality={personality}
            scenario={selectedScenario}
            messages={messages}
            userTurnCount={userTurnCount}
            maxTurns={MAX_USER_TURNS}
            isThinking={isThinking}
            onSend={sendMessage}
            onEnd={() => finishConversation()}
          />
        )}
        {view === 'feedback' && selectedScenario && feedback && (
          <FeedbackScreen
            persona={persona}
            personality={personality}
            scenario={selectedScenario}
            feedback={feedback}
            onRestart={reset}
          />
        )}
      </main>
    </div>
  )
}

export default App
