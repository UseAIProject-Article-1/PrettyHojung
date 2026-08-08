import type { Persona, Scenario } from '../types'

interface SetupScreenProps {
  personas: Persona[]
  persona: Persona
  scenarios: Scenario[]
  selectedScenario: Scenario | null
  isLoading: boolean
  onPersonaSelect: (persona: Persona) => void
  onScenarioSelect: (scenario: Scenario) => void
  onStart: () => void
}

export function SetupScreen({
  personas,
  persona,
  scenarios,
  selectedScenario,
  isLoading,
  onPersonaSelect,
  onScenarioSelect,
  onStart,
}: SetupScreenProps) {
  return (
    <div className="setup-page page">
      <section aria-labelledby="person-heading">
        <div className="title-row">
          <span className="section-number">1</span>
          <div>
            <h1 id="person-heading">누구와 대화할까요?</h1>
            <p>한 명을 골라 주세요</p>
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
          </div>
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
            <h2 id="scenario-heading">대화할 상황은?</h2>
            <p>AI가 골라 준 상황 중 하나를 선택해요</p>
          </div>
          <span className="ai-label">✦ AI 추천</span>
        </div>

        {isLoading ? (
          <div className="scenario-loading" role="status">
            <span />
            <span />
            <span />
            <span />
            <span />
            <p>상황을 만들고 있어요</p>
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
                <small>{persona.name}와</small>
                <strong>{selectedScenario.title}</strong>
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
          플레이하기
        </button>
      </div>
    </div>
  )
}
