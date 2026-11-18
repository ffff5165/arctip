import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { Menu, X } from 'lucide-react'
import { ARC_CHAIN_ID, shortAddress } from '@/lib/arctip'
import { Link, usePathname } from '@/lib/router'

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect width="28" height="28" rx="9" fill="#0a1f44" />
        <path d="M7 19c1.2-5.6 3.8-8.5 7-8.5S19.8 13.4 21 19" stroke="#85b1ed" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="14" cy="7.5" r="1.8" fill="#fff" />
      </svg>
      <span className="display text-lg font-bold text-navy-900">ArcTip</span>
    </span>
  )
}

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/create-profile', label: 'Create profile' },
] as const

function WalletButton() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID

  return (
    <div className="flex items-center gap-2">
      {wrongChain && (
        <button className="btn-ghost hidden sm:inline-flex" disabled={isPending} onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}>
          Switch to Arc Testnet
        </button>
      )}
      <ConnectKitButton.Custom>
        {({ isConnected: connected, isConnecting, show, address }) => (
          <button className="btn-primary" onClick={show}>
            {isConnecting ? 'Connecting...' : connected && address ? shortAddress(address) : 'Connect wallet'}
          </button>
        )}
      </ConnectKitButton.Custom>
    </div>
  )
}

/** Always-visible network indicator. Warns when the wallet is on another chain. */
function NetworkStrip() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID

  return (
    <div className="bg-navy-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 text-xs sm:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="size-1.5 rounded-full bg-[#85b1ed]" />
          Arc Testnet
          <span className="hidden font-normal text-slate-300 sm:inline">Test USDC only. No real funds.</span>
        </span>
        {wrongChain ? (
          <button
            className="font-semibold text-[#acc6e9] underline-offset-2 hover:underline disabled:opacity-60"
            disabled={isPending}
            onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
          >
            Wallet is on another network. Switch
          </button>
        ) : (
          <span className="text-slate-300">{isConnected ? 'Wallet on Arc Testnet' : 'Wallet not connected'}</span>
        )}
      </div>
    </div>
  )
}

export function Header() {
  const path = usePathname()
  // The menu is open only for the page it was opened on, so navigating closes it.
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === path

  const isActive = (to: string) => (to === '/' ? path === '/' : path === to)

  return (
    <header className="sticky top-0 z-40">
      <NetworkStrip />
      <div className="border-b border-[color:var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" aria-label="ArcTip home">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive(item.to) ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-mist ${
                    isActive(item.to) ? 'bg-brand-soft text-navy-900' : 'text-[color:var(--muted)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <WalletButton />
            <button
              type="button"
              className="btn-ghost !px-3 md:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpenPath(open ? null : path)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-[color:var(--border)] bg-white px-4 py-3 md:hidden" aria-label="Mobile">
            <ul className="mx-auto grid max-w-6xl gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={isActive(item.to) ? 'page' : undefined}
                    className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold ${
                      isActive(item.to) ? 'bg-brand-soft text-navy-900' : 'text-[color:var(--ink-2)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)] bg-brand-mist">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-[color:var(--muted)] sm:px-6 md:flex-row md:items-center md:justify-between">
        <Logo />
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="font-medium hover:text-navy-900">
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="text-pretty">Arc Testnet only. Tips use test USDC with no real value.</p>
      </div>
    </footer>
  )
}
