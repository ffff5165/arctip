import { useCallback, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/**
 * Minimal path router (History API). Shareable pages live in the URL path,
 * e.g. /c/alice, so links keep working inside the share frame.
 */

const NAV_EVENT = 'arctip:navigate'

export function navigate(to: string) {
  if (to === window.location.pathname + window.location.search) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new Event(NAV_EVENT))
  window.scrollTo({ top: 0 })
}

export function usePathname(): string {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener(NAV_EVENT, sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener(NAV_EVENT, sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])
  return path
}

export type Route =
  | { name: 'home' }
  | { name: 'creator'; handle: string }
  | { name: 'dashboard' }
  | { name: 'createProfile' }
  | { name: 'history' }
  | { name: 'notFound' }

export function matchRoute(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/'
  if (clean === '/') return { name: 'home' }
  if (clean === '/dashboard') return { name: 'dashboard' }
  if (clean === '/create-profile') return { name: 'createProfile' }
  if (clean === '/history') return { name: 'history' }
  const creator = /^\/c\/([A-Za-z0-9_]{1,32})$/.exec(clean)
  if (creator) return { name: 'creator', handle: creator[1].toLowerCase() }
  return { name: 'notFound' }
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const handle = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
      event.preventDefault()
      navigate(to)
    },
    [onClick, to],
  )
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
