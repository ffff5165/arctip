import { Check, Copy, ExternalLink, FlaskConical, Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { ARCTIP_ADDRESS, ARC_CHAIN_ID, shortAddress } from '@/lib/arctip'
import { formatUsdc } from '@/onchain-money'

export function Avatar({ name, url, size = 56 }: { name: string; url?: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initials = name.trim().slice(0, 2).toUpperCase() || 'A'
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="display flex items-center justify-center rounded-full bg-navy-900 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </div>
  )
}

export function UsdcAmount({ raw, className }: { raw: bigint; className?: string }) {
  const [whole, fraction = ''] = formatUsdc(raw).split('.')
  const grouped = Number(whole).toLocaleString('en-US')
  const decimals = fraction.padEnd(2, '0')
  return (
    <span className={`tabular-nums ${className ?? ''}`}>
      {grouped}.{decimals}
    </span>
  )
}

export function TxLink({ hash, label = 'View on ArcScan' }: { hash: string; label?: string }) {
  return (
    <a
      href={buildTxExplorerUrl(ARC_CHAIN_ID, hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
    >
      {label} <ExternalLink className="size-3" />
    </a>
  )
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }}
      className="btn-ghost"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

export function AddressChip({ address }: { address: string }) {
  return <span className="mono text-xs text-[color:var(--muted)]">{shortAddress(address)}</span>
}

export function Spinner({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <Loader2 className="size-4 animate-spin" /> {children}
    </span>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="inner flex flex-col items-center gap-2 px-6 py-10 text-center">
      <h3 className="display text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-pretty text-sm text-[color:var(--muted)]">{body}</p>
      {action}
    </div>
  )
}

/** Shown on every page that depends on the ArcTip contract while it is not deployed. */
export function DemoBanner({ children }: { children?: ReactNode }) {
  if (ARCTIP_ADDRESS) return null
  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">Demo UI. The ArcTip contract is not deployed yet.</p>
        <p className="mt-0.5 text-pretty text-amber-800">
          {children ??
            'This page shows the real layout, but nothing here is read from or written to the blockchain. No tips can be sent and no records exist.'}
        </p>
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-balance text-3xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-pretty text-[color:var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
