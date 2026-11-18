import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { useTipHistory } from '@/hooks/useTipHistory'
import { ARCTIP_ADDRESS } from '@/lib/arctip'
import { DemoBanner, EmptyState, PageHeader } from '@/components/ui'
import { TxTable } from '@/components/TxTable'

type Tab = 'received' | 'sent'

export function HistoryPage() {
  const { address, isConnected } = useAccount()
  const [tab, setTab] = useState<Tab>('received')
  const received = useTipHistory({ creator: address })
  const sent = useTipHistory({ supporter: address })
  const unavailable = !ARCTIP_ADDRESS

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'received', label: 'Received', count: received.data?.entries.length },
    { id: 'sent', label: 'Sent', count: sent.data?.entries.length },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Transaction history" subtitle="Tips you received and tips you sent, read directly from Arc Testnet." />
      <DemoBanner>There is no onchain history to read yet. The table below fills with real transactions once the contract is live.</DemoBanner>

      {!isConnected ? (
        <EmptyState
          title="Connect your wallet"
          body="Your history is tied to your wallet address. Connect to see tips you sent and received."
          action={
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button className="btn-primary mt-2" onClick={show}>
                  Connect wallet
                </button>
              )}
            </ConnectKitButton.Custom>
          }
        />
      ) : (
        <section className="card p-5 sm:p-6">
          <div role="tablist" aria-label="History view" className="mb-5 inline-flex rounded-2xl bg-brand-mist p-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition-colors ${
                  tab === item.id ? 'bg-white text-navy-900 shadow-sm' : 'text-[color:var(--muted)] hover:text-navy-900'
                }`}
              >
                {item.label}
                {item.count !== undefined && <span className="ml-1.5 tabular-nums text-[color:var(--subtle)]">{item.count}</span>}
              </button>
            ))}
          </div>

          {tab === 'received' ? (
            <TxTable
              history={received}
              counterparty="sender"
              unavailable={unavailable}
              emptyTitle={unavailable ? 'No history available yet' : 'No tips received yet'}
              emptyBody={
                unavailable
                  ? 'Transactions are read from the ArcTip contract, which is not deployed yet.'
                  : 'Share your tipping link. Tips appear here once they confirm onchain.'
              }
            />
          ) : (
            <TxTable
              history={sent}
              counterparty="recipient"
              unavailable={unavailable}
              emptyTitle={unavailable ? 'No history available yet' : 'You have not sent any tips'}
              emptyBody={
                unavailable
                  ? 'Transactions are read from the ArcTip contract, which is not deployed yet.'
                  : 'Visit a creator page to send your first tip.'
              }
            />
          )}
        </section>
      )}
    </div>
  )
}
