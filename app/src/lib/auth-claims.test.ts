import { describe, expect, it, vi } from 'vitest'
import { claimsToUser, getUserFromClient, type AuthClientLike } from './auth-claims'

describe('claimsToUser', () => {
  it('maps sub + email', () => {
    expect(claimsToUser({ sub: 'u1', email: 'a@b.c', role: 'authenticated' })).toEqual({ id: 'u1', email: 'a@b.c' })
  })

  it('tolerates a missing email', () => {
    expect(claimsToUser({ sub: 'u1' })).toEqual({ id: 'u1', email: '' })
  })

  it('rejects malformed, empty and anon-key claims', () => {
    expect(claimsToUser(null)).toBeNull()
    expect(claimsToUser({})).toBeNull()
    expect(claimsToUser({ sub: 42 })).toBeNull()
    expect(claimsToUser({ sub: 'u1', role: 'anon' })).toBeNull()
  })
})

describe('getUserFromClient', () => {
  const fail = { data: { user: null }, error: new Error('no') }

  it('uses verified claims and never calls getUser when they are good', async () => {
    const getUser = vi.fn()
    const client: AuthClientLike = {
      auth: { getClaims: async () => ({ data: { claims: { sub: 'u1', email: 'x@y.z' } }, error: null }), getUser },
    }
    expect(await getUserFromClient(client)).toEqual({ id: 'u1', email: 'x@y.z' })
    expect(getUser).not.toHaveBeenCalled()
  })

  it('falls back to getUser when claims are unavailable or throw', async () => {
    const getUser = vi.fn(async () => ({ data: { user: { id: 'u2', email: 'm@n.o' } }, error: null }))
    const unavailable: AuthClientLike = { auth: { getUser } }
    const throwing: AuthClientLike = {
      auth: {
        getClaims: async () => {
          throw new Error('network')
        },
        getUser,
      },
    }
    expect(await getUserFromClient(unavailable)).toEqual({ id: 'u2', email: 'm@n.o' })
    expect(await getUserFromClient(throwing)).toEqual({ id: 'u2', email: 'm@n.o' })
    expect(getUser).toHaveBeenCalledTimes(2)
  })

  it('returns null without a server call when there is no session at all', async () => {
    const getUser = vi.fn(async () => fail)
    const client: AuthClientLike = {
      auth: {
        getClaims: async () => ({ data: null, error: { name: 'AuthSessionMissingError' } }),
        getUser,
      },
    }
    expect(await getUserFromClient(client)).toBeNull()
    expect(getUser).not.toHaveBeenCalled()
  })

  it('returns null when both checks fail', async () => {
    const client: AuthClientLike = {
      auth: { getClaims: async () => ({ data: null, error: new Error('invalid jwt') }), getUser: async () => fail },
    }
    expect(await getUserFromClient(client)).toBeNull()
  })
})
