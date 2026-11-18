import { CheckCircle2 } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { TipEntry, TipHistory } from '@/hooks/useTipHistory'
import { ARC_CHAIN_ID, shortAddress } from '@/lib/arctip'
import { buildAddressExplorerUrl, buildTxExplorerUrl } from '@/onchain-facts'
import { EmptyState, UsdcAmount } from '@/components/ui'

export function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Every record here is a Tipped event, which only exists for a transaction that succeeded. */
function StatusBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[color:var(--success)]">
      <CheckCircle2 className="size-3.5" /> Confirmed
    </span>
  )
}

function Hash({ hash }: { hash: string }) {
  return (
    <a
      href={buildTxExplorerUrl(ARC_CHAIN_ID, hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="mono text-xs font-medium text-brand hover:underline"
      title={hash}
    >
      {hash.slice(0, 10)}...{hash.slice(-6)}
    </a>
  )
}

function Party({ address }: { address: string }) {
  return (
    <a
      href={buildAddressExplorerUrl(ARC_CHAIN_ID, address)}
      target="_blank"
      rel="noopener noreferrer"
      className="mono text-xs text-[color:var(--ink-2)] hover:underline"
      title={address}
    >
      {shortAddress(address)}
    </a>
  )
}

interface Props {
  history: UseQueryResult<TipHistory>
  /** Which address to show as the counterparty. */
  counterparty: 'sender' | 'recipient'
  emptyTitle: string
  emptyBody: string
  limit?: number
  /** Replaces the empty state when there is no data source at all (contract not deployed). */
  unavailable?: boolean
}

export function TxTable({ history, counterparty, emptyTitle, emptyBody, limit, unavailable }: Props) {
  if (unavailable) {
    return <EmptyState title={emptyTitle} body={emptyBody} />
  }
  if (history.isLoading) {
    return (
      <div className="space-y-2" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="inner h-14 animate-pulse" />
        ))}
      </div>
    )
  }
  if (history.isError) {
    return (
      <EmptyState
        title="Could not load transactions"
        body="Arc Testnet did not answer. Your records are safe onchain. Try again in a moment."
        action={
          <button className="btn-ghost mt-2" onClick={() => void history.refetch()}>
            Retry
          </button>
        }
      />
    )
  }

  const data = history.data
  const rows: TipEntry[] = data ? (limit ? data.entries.slice(0, limit) : data.entries) : []
  if (!data || rows.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState title={emptyTitle} body={emptyBody} />
        {data && <ScanNote data={data} />}
      </div>
    )
  }

  const partyLabel = counterparty === 'sender' ? 'Sender' : 'Recipient'
  const party = (tip: TipEntry) => (counterparty === 'sender' ? tip.supporter : tip.creator)

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Transaction hash', partyLabel, 'Amount', 'Date', 'Status'].map((heading) => (
                <th key={heading} scope="col" className="label whitespace-nowrap py-2.5 pr-4 font-semibold last:pr-0">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {rows.map((tip) => (
              <tr key={`${tip.txHash}-${tip.logIndex}`}>
                <td className="py-3.5 pr-4">
                  <Hash hash={tip.txHash} />
                </td>
                <td className="py-3.5 pr-4">
                  <Party address={party(tip)} />
                </td>
                <td className="whitespace-nowrap py-3.5 pr-4 font-semibold text-navy-900">
                  <UsdcAmount raw={tip.amount} /> <span className="text-xs font-medium text-[color:var(--subtle)]">USDC</span>
                </td>
                <td className="whitespace-nowrap py-3.5 pr-4 text-[color:var(--muted)]">{formatDate(tip.timestamp)}</td>
                <td className="py-3.5">
                  <StatusBadge />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((tip) => (
          <li key={`${tip.txHash}-${tip.logIndex}`} className="inner space-y-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="display text-lg font-semibold text-navy-900">
                <UsdcAmount raw={tip.amount} /> <span className="text-xs font-medium text-[color:var(--subtle)]">USDC</span>
              </span>
              <StatusBadge />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-[color:var(--subtle)]">{partyLabel}</dt>
              <dd className="text-right">
                <Party address={party(tip)} />
              </dd>
              <dt className="text-[color:var(--subtle)]">Date</dt>
              <dd className="text-right text-[color:var(--muted)]">{formatDate(tip.timestamp)}</dd>
              <dt className="text-[color:var(--subtle)]">Hash</dt>
              <dd className="text-right">
                <Hash hash={tip.txHash} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>
      <ScanNote data={data} />
    </div>
  )
}

function ScanNote({ data }: { data: TipHistory }) {
  return (
    <p className="text-xs text-[color:var(--subtle)]">
      {data.complete
        ? 'Showing every tip since the contract was deployed. Reverted transactions emit no record and are not listed.'
        : `Showing blocks ${data.fromBlock.toString()} to ${data.headBlock.toString()} only. Older tips are not scanned until the deployment block is configured.`}
    </p>
  )
}
