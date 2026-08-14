import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { conversationEngine } from './services/conversationEngine'

vi.mock('./services/conversationEngine', () => ({
  conversationEngine: {
    suggestScenarios: vi.fn(),
    reply: vi.fn(),
    evaluate: vi.fn(),
  },
}))

const scenario = {
  id: 'qa-scenario',
  personaId: 'parent' as const,
  emoji: '💬',
  title: 'QA 상담 상황',
  hint: '차분하게 말해요.',
  openingLine: '무슨 일이 있었는지 말해 줄래?',
}

describe('상담 종료 흐름', () => {
  beforeEach(() => {
    vi.mocked(conversationEngine.suggestScenarios).mockResolvedValue([scenario])
    vi.mocked(conversationEngine.reply).mockImplementation(async (context) => (
      `마지막까지 읽을 AI 답변 ${context.turn}`
    ))
    vi.mocked(conversationEngine.evaluate).mockResolvedValue({
      score: 90,
      goodPoint: '마음을 분명히 말했어요.',
      betterPoint: '차분하게 부탁해요.',
    })
  })

  it('마지막 AI 답변을 유지하고 대화 마치기 클릭 후 한 번만 평가한다', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /QA 상담 상황/ }))
    fireEvent.click(screen.getByRole('button', { name: /상담 시작/ }))

    for (let turn = 1; turn <= 5; turn += 1) {
      const input = screen.getByLabelText('상담 내용 입력')
      fireEvent.change(input, { target: { value: `학생 답변 ${turn}` } })
      fireEvent.click(screen.getByRole('button', { name: '답변 보내기' }))
      await screen.findByText(`마지막까지 읽을 AI 답변 ${turn}`)
    }

    expect(screen.getByText('마지막까지 읽을 AI 답변 5')).toBeVisible()
    expect(screen.getByRole('button', { name: '대화 마치기' })).toBeEnabled()
    expect(screen.getByLabelText('상담 내용 입력')).toBeDisabled()
    expect(conversationEngine.evaluate).not.toHaveBeenCalled()

    const finishButton = screen.getByRole('button', { name: '대화 마치기' })
    fireEvent.click(finishButton)
    fireEvent.click(finishButton)

    await screen.findByText('90')
    expect(conversationEngine.evaluate).toHaveBeenCalledTimes(1)
  })
})
