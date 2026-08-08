import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RoundSessionRepository } from '../../../domain/ports/roundSession'
import { useRoundSession } from './useRoundSession'

describe('useRoundSession', () => {
  it('initializes once and exposes the safe-mode result for missing input', async () => {
    const load = vi.fn().mockResolvedValue({ ok: true, value: null })
    const repository = {
      load,
    } as unknown as RoundSessionRepository
    const { result } = renderHook(() => useRoundSession(repository, false))
    await waitFor(() => expect(result.current.state.status).toBe('safe-mode'))
    expect(load).toHaveBeenCalledOnce()
    expect(result.current.state.status).toBe('safe-mode')
  })
})
