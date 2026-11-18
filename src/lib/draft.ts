import { useCallback, useEffect, useState } from 'react'

/**
 * Local profile draft, used ONLY while the ArcTip contract is not deployed.
 * It lives in this browser's localStorage. It is not onchain and nobody else can see it.
 */
export interface ProfileDraft {
  handle: string
  displayName: string
  bio: string
  avatarUrl: string
}

const PREFIX = 'arctip:draft:'
const EVENT = 'arctip:draft-changed'

function parse(raw: string | null): ProfileDraft | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<ProfileDraft>
    if (typeof value.handle !== 'string' || typeof value.displayName !== 'string') return null
    return {
      handle: value.handle,
      displayName: value.displayName,
      bio: typeof value.bio === 'string' ? value.bio : '',
      avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : '',
    }
  } catch {
    return null
  }
}

export function loadDraft(wallet: string): ProfileDraft | null {
  return parse(localStorage.getItem(PREFIX + wallet.toLowerCase()))
}

export function findDraftByHandle(handle: string): ProfileDraft | null {
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    const draft = parse(localStorage.getItem(key))
    if (draft?.handle === handle) return draft
  }
  return null
}

export function saveDraft(wallet: string, draft: ProfileDraft) {
  localStorage.setItem(PREFIX + wallet.toLowerCase(), JSON.stringify(draft))
  window.dispatchEvent(new Event(EVENT))
}

export function clearDraft(wallet: string) {
  localStorage.removeItem(PREFIX + wallet.toLowerCase())
  window.dispatchEvent(new Event(EVENT))
}

export function useDraft(wallet: string | undefined) {
  const [draft, setDraft] = useState<ProfileDraft | null>(() => (wallet ? loadDraft(wallet) : null))

  useEffect(() => {
    const sync = () => setDraft(wallet ? loadDraft(wallet) : null)
    sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [wallet])

  const save = useCallback((next: ProfileDraft) => wallet && saveDraft(wallet, next), [wallet])
  const clear = useCallback(() => wallet && clearDraft(wallet), [wallet])
  return { draft, save, clear }
}
