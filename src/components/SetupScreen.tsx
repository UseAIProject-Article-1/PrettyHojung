import bunnyDoodle from '../assets/nunchi/bunny-doodle.svg'
import type { Persona, PersonalityStyle, Scenario } from '../types'

interface SetupScreenProps {
  personas: Persona[]
  persona: Persona
  personalityStyles: PersonalityStyle[]
  personality: PersonalityStyle
  scenarios: Scenario[]
  selectedScenario: Scenario | null
  isLoading: boolean
  onPersonaSelect: (persona: Persona) => void
  onPersonalitySelect: (personality: PersonalityStyle) => void
  onScenarioSelect: (scenario: Scenario) => void
  onStart: () => void
}

export function SetupScreen({
  personas,
  persona,
  personalityStyles,
  personality,
  scenarios,
  selectedScenario,
  isLoading,
  onPersonaSelect,
  onPersonalitySelect,
  onScenarioSelect,
  onStart,
}: SetupScreenProps) {
  return (
    <div className="setup-page page">
      <div className="setup-intro">
        <div>
          <span>오늘의 예절 상담</span>
          <h1>마음속 이야기를<br />천천히 들려주세요</h1>
          <p>정답은 없어요. 토끼 코치가 공감하며 함께 방법을 찾아볼게요.</p>
        </div>
        <img src={bunnyDoodle} alt="꽃을 든 눈치코치 토끼" />
      </div>

      <section aria-labelledby="person-heading">
        <div className="title-row">
          <span className="section-number">1</span>
          <div>
            <h1 id="person-heading">누구와의 일을 상담할까요?</h1>
            <p>고민과 관련된 사람을 골라 주세요</p>
          </div>
        </div>

        <div className="persona-tabs">
          {personas.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === persona.id ? 'persona-tab active' : 'persona-tab'}
              onClick={() => onPersonaSelect(item)}
              aria-pressed={item.id === persona.id}
            >
              <span
                className="tab-emoji"
                style={{ backgroundColor: `${item.color}55` }}
                aria-hidden="true"
              >
                {item.emoji}
              </span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>

        <article className="persona-profile">
          <div
            className="profile-visual"
            style={{ backgroundColor: `${persona.color}55` }}
          >
            <span aria-hidden="true">{persona.emoji}</span>
            <i style={{ backgroundColor: persona.color }} />
          </div>
          <div className="profile-copy">
            <span className="profile-label">{persona.relationship}</span>
            <div className="profile-name">
              <h2>{persona.name}</h2>
              <span>{persona.gender}</span>
            </div>
            <p>{persona.personality}</p>
            <div className="tone-chip">
              <span aria-hidden="true">💬</span>
              {persona.tone}
            </div>
            <div className="personality-picker">
              <span>눈치코치가 어떤 방식으로 상담할까요?</span>
              <div>
                {personalityStyles.map((style) => (
                  <button
                    type="button"
                    key={style.id}
                    className={
                      personality.id === style.id
                        ? 'personality-button active'
                        : 'personality-button'
                    }
                    onClick={() => onPersonalitySelect(style)}
                    aria-pressed={personality.id === style.id}
                  >
                    <span aria-hidden="true">{style.emoji}</span>
                    {style.label}
                  </button>
                ))}
              </div>
              <p>
                <strong>{personality.emoji} {personality.label}</strong>
                {personality.description}
              </p>
            </div>
          </div>
          <img className="profile-bunny" src={bunnyDoodle} alt="" />
          <div className="profile-decoration" aria-hidden="true">
            <span>✦</span>
            <span>●</span>
            <span>＋</span>
          </div>
        </article>
      </section>

      <section className="scenario-section" aria-labelledby="scenario-heading">
        <div className="title-row">
          <span className="section-number">2</span>
          <div>
            <h2 id="scenario-heading">어떤 일을 상담할까요?</h2>
            <p>AI가 만든 예절 상담 주제 중 하나를 선택해요</p>
          </div>
          <span className="recommend-label">토끼의 추천</span>
        </div>

        {isLoading ? (
          <div className="scenario-loading" role="status">
            <span />
            <span />
            <span />
            <span />
            <span />
            <p>
              <img src={bunnyDoodle} alt="" />
              상황을 만들고 있어요
            </p>
          </div>
        ) : (
          <div className="scenario-grid">
            {scenarios.map((scenario) => (
              <button
                type="button"
                key={scenario.id}
                className={
                  selectedScenario?.id === scenario.id
                    ? 'scenario-card selected'
                    : 'scenario-card'
                }
                onClick={() => onScenarioSelect(scenario)}
                aria-pressed={selectedScenario?.id === scenario.id}
              >
                <span className="scenario-emoji" aria-hidden="true">
                  {scenario.emoji}
                </span>
                <span>
                  <strong>{scenario.title}</strong>
                  <small>{scenario.hint}</small>
                </span>
                <i aria-hidden="true">✓</i>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="start-bar">
        <div>
          {selectedScenario ? (
            <>
              <span aria-hidden="true">{selectedScenario.emoji}</span>
              <p>
                <small>{persona.name}와의 일을</small>
                <strong>{personality.label} 방식으로 상담 · {selectedScenario.title}</strong>
              </p>
            </>
          ) : (
            <p>
              <small>상황을 고르면</small>
              <strong>플레이 버튼이 열려요</strong>
            </p>
          )}
        </div>
        <button
          type="button"
          className="play-button"
          onClick={onStart}
          disabled={!selectedScenario}
        >
          <span aria-hidden="true">▶</span>
          상담 시작
        </button>
      </div>
    </div>
  )
}
