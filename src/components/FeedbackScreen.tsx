import bunnyReading from '../assets/nunchi/bunny-doodle.svg'
import type {
  Feedback,
  Persona,
  PersonalityStyle,
  Scenario,
} from '../types'

interface FeedbackScreenProps {
  persona: Persona
  personality: PersonalityStyle
  scenario: Scenario
  feedback: Feedback
  onRestart: () => void
}

export function FeedbackScreen({
  persona,
  personality,
  scenario,
  feedback,
  onRestart,
}: FeedbackScreenProps) {
  return (
    <div className="feedback-page page">
      <header className="feedback-heading">
        <img className="feedback-mascot" src={bunnyReading} alt="" />
        <div className="celebration" aria-hidden="true">
          <span>✦</span>
          <span>●</span>
          <span>◆</span>
          <span>＋</span>
        </div>
        <span className="complete-chip">대화 완료!</span>
        <h1>내 마음을 잘 말했어요</h1>
        <p>{persona.name}와의 고민 · {personality.emoji} {personality.label} 상담</p>
      </header>

      <section className="score-card" aria-label={`대화 점수 ${feedback.score}%`}>
        <div
          className="score-circle"
          style={{
            background: `conic-gradient(#7562b5 0deg ${feedback.score * 3.6}deg, #ebe7f5 ${feedback.score * 3.6}deg)`,
          }}
        >
          <div>
            <strong>{feedback.score}</strong>
            <span>%</span>
          </div>
        </div>
        <div>
          <span>{scenario.emoji}</span>
          <p>
            <small>{scenario.title}</small>
            <strong>용기 레벨 UP!</strong>
          </p>
        </div>
      </section>

      <div className="feedback-cards">
        <section className="feedback-item good">
          <div className="feedback-icon" aria-hidden="true">👍</div>
          <div>
            <span>좋았던 점</span>
            <h2>{feedback.goodPoint}</h2>
          </div>
        </section>

        <section className="feedback-item better">
          <div className="feedback-icon" aria-hidden="true">💡</div>
          <div>
            <span>다음에 실천할 예절</span>
            <h2>{feedback.betterPoint}</h2>
          </div>
        </section>
      </div>

      <button className="again-button" type="button" onClick={onRestart}>
        <span aria-hidden="true">↻</span>
        다른 대화 해보기
      </button>
    </div>
  )
}
