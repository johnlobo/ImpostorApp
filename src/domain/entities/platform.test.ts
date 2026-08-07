import { describe, expect, it } from 'vitest'
import { initialNavigationState, navigationReducer } from '../../app/navigation'
import { serializePublicError, type PublicPlatformError } from './platform'

describe('public platform contracts', () => {
  it('serializes only public error fields', () => {
    const error = {
      code: 'storage-full',
      retryable: true,
      payload: { concept: 'secret', role: 'impostor' },
      technicalCause: 'private details',
    } as PublicPlatformError

    expect(serializePublicError(error)).toBe('{"code":"storage-full","retryable":true}')
    expect(serializePublicError(error)).not.toMatch(/secret|impostor|private details/)
  })

  it('uses explicit, reversible public navigation transitions', () => {
    const help = navigationReducer(initialNavigationState, { type: 'OPEN_HELP' })
    expect(help).toEqual({ screen: 'help' })
    expect(navigationReducer(help, { type: 'BACK' })).toEqual({ screen: 'home' })
  })

  it('keeps navigation state free of URL and game payload fields', () => {
    expect(Object.keys(initialNavigationState)).toEqual(['screen'])
    expect(JSON.stringify(initialNavigationState)).not.toMatch(/role|vote|concept|player|url/i)
  })
})
