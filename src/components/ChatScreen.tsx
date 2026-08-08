import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import bunnyThinking from '../assets/nunchi/bunny-doodle.svg'
import type {
  ChatMessage,
  Persona,
  PersonalityStyle,
  Scenario,
} from '../types'

interface ChatScreenProps {
  persona: Persona
  personality: PersonalityStyle
  scenario: Scenario
  messages: ChatMessage[]
  userTurnCount: number
  maxTurns: number
  isThinking: boolean
  onSend: (message: string) => void
  onEnd: () => void
}

export function ChatScreen({
  persona,
  personality,
  scenario,
  messages,
  userTurnCount,
  maxTurns,
  isThinking,
  onSend,
  onEnd,
}: ChatScreenProps) {
  const [input, setInput] = useState('')
  const messageListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isThinking])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || isThinking) return
    onSend(message)
    setInput('')
  }

  return (
    <div className="chat-page">
      <header className="chat-topbar">
        <div className="chat-person">
          <span
            className="chat-person-avatar"
            aria-hidden="true"
          >
            🐰
          </span>
          <div>
            <strong>눈치코치 예절 상담자</strong>
            <small>{persona.name}와의 일 · {personality.emoji} {personality.label} 상담</small>
          </div>
        </div>
        <div className="turn-progress" aria-label={`${userTurnCount}/${maxTurns}회 답변`}>
          {Array.from({ length: maxTurns }, (_, index) => (
            <i
              key={index}
              className={index < userTurnCount ? 'filled' : ''}
              aria-hidden="true"
            />
          ))}
          <span>{userTurnCount}/{maxTurns}</span>
        </div>
        <button
          className="end-button"
          type="button"
          onClick={onEnd}
          disabled={isThinking}
        >
          대화 종료
        </button>
      </header>

      <div className="chat-scene">
        <span aria-hidden="true">{scenario.emoji}</span>
        <p>{scenario.title}</p>
        <img src={bunnyThinking} alt="" />
      </div>

      <div className="messages" aria-live="polite" ref={messageListRef}>
        {messages.map((message) => (
          <div
            className={
              message.sender === 'user'
                ? 'message user-message'
                : 'message assistant-message'
            }
            key={message.id}
          >
            {message.sender === 'assistant' && (
              <span
                className="message-avatar"
                aria-hidden="true"
              >
                🐰
              </span>
            )}
            <div>
              <small>{message.sender === 'assistant' ? '눈치코치' : '나'}</small>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="message assistant-message thinking">
            <span
              className="message-avatar"
              aria-hidden="true"
            >
              🐰
            </span>
            <div>
              <small>눈치코치</small>
              <p>
                <i />
                <i />
                <i />
              </p>
            </div>
          </div>
        )}
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-message">
          상담 내용 입력
        </label>
        <textarea
          id="chat-message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder="어떤 일이 있었는지 편하게 이야기해 주세요"
          rows={1}
          disabled={isThinking}
          autoFocus
        />
        <button
          type="submit"
          className="send-button"
          disabled={!input.trim() || isThinking}
          aria-label="답변 보내기"
        >
          ↑
        </button>
        <p>Enter로 보내기 · 답변은 최대 5번</p>
      </form>
    </div>
  )
}
