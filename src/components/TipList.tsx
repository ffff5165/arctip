import { ArrowUpRight } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { TipHistory } from '@/hooks/useTipHistory'
import { AddressChip, EmptyState, TxLink, UsdcAmount } from '@/components/ui'

function timeAgo(timestamp?: number): string {
  if (!timestamp) return ''
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`
  return new Date(timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Onchain tip records, newest first. Renders real events only. */
export function TipList({
  history,
  emptyTitle,
  emptyBody,
  perspective,
}: {
  history: UseQueryResult<TipHistory>
  emptyTitle: string
  emptyBody: string
  perspective: 'supporter' | 'creator'
}) {
  if (history.isLoading) {
    return (
      <div className="space-y-2" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="inner h-16 animate-pulse" />
        ))}
      </div>
    )
  }
  if (history.isError) {
    return (
      <EmptyState
        title="Could not load tip history"
        body="Arc Testnet did not answer. Try again in a moment."
        action={
          <button className="btn-ghost mt-2" onClick={() => void history.refetch()}>
            Retry
          </button>
        }
      />
    )
  }
  const data = history.data
  if (!data || data.entries.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState title={emptyTitle} body={emptyBody} />
        {data && <ScanNote data={data} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-[color:var(--border)]">
        {data.entries.map((tip) => (
          <li key={`${tip.txHash}-${tip.logIndex}`} className="flex items-start justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                {perspective === 'creator' ? 'From' : 'To'}{' '}
                <AddressChip address={perspective === 'creator' ? tip.supporter : tip.creator} />
              </p>
              {tip.message && <p className="mt-1 break-words text-pretty text-sm text-[color:var(--ink-2)]">{tip.message}</p>}
              <p className="mt-1.5 flex items-center gap-3 text-xs text-[color:var(--subtle)]">
                <span>{timeAgo(tip.timestamp)}</span>
                <TxLink hash={tip.txHash} label="Transaction" />
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-right">
              <ArrowUpRight className="size-4 text-[color:var(--success)]" />
              <span className="display text-base font-semibold text-navy-900">
                <UsdcAmount raw={tip.amount} /> <span className="text-xs font-medium text-[color:var(--subtle)]">USDC</span>
              </span>
            </div>
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
        ? 'Showing every tip since the contract was deployed.'
        : `Showing tips from block ${data.fromBlock.toString()} to ${data.headBlock.toString()}. Older tips are not scanned until the deployment block is configured.`}
    </p>
  )
}
