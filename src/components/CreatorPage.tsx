import { useEffect, useState, type ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import type { Address } from 'viem'
import { useCreatorByHandle } from '@/hooks/useCreator'
import { useTipHistory } from '@/hooks/useTipHistory'
import { findDraftByHandle } from '@/lib/draft'
import { buildShareLink } from '@/lib/share'
import { ARCTIP_ADDRESS, ARC_CHAIN_ID } from '@/lib/arctip'
import { buildAddressExplorerUrl } from '@/onchain-facts'
import { Link } from '@/lib/router'
import { Avatar, CopyButton, DemoBanner, EmptyState, UsdcAmount } from '@/components/ui'
import { TipCard } from '@/components/TipCard'
import { TipList } from '@/components/TipList'

interface View {
  handle: string
  displayName: string
  bio: string
  avatarUrl: string
  address?: Address
  totals?: { total: bigint; count: bigint }
}

const NONE = <span className="text-[color:var(--subtle)]">&mdash;</span>

function Profile({ view }: { view: View }) {
  const [shareUrl, setShareUrl] = useState('')
  useEffect(() => {
    void buildShareLink(`/c/${view.handle}`).then(setShareUrl)
  }, [view.handle])

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <Avatar key={view.avatarUrl} name={view.displayName || view.handle} url={view.avatarUrl} size={72} />
        <div className="min-w-0">
          <h1 className="display break-words text-2xl font-bold text-navy-900">{view.displayName || `@${view.handle}`}</h1>
          <p className="text-sm text-[color:var(--muted)]">@{view.handle}</p>
        </div>
      </div>
      {view.bio && <p className="mt-4 whitespace-pre-line break-words text-pretty text-[color:var(--ink-2)]">{view.bio}</p>}

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="inner p-4">
          <dt className="label">Tips received</dt>
          <dd className="display mt-1 text-2xl font-bold tabular-nums">{view.totals ? view.totals.count.toString() : NONE}</dd>
        </div>
        <div className="inner p-4">
          <dt className="label">Total USDC</dt>
          <dd className="display mt-1 text-2xl font-bold">{view.totals ? <UsdcAmount raw={view.totals.total} /> : NONE}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <CopyButton value={shareUrl} label="Copy page link" />
        {view.address && (
          <a className="btn-ghost" href={buildAddressExplorerUrl(ARC_CHAIN_ID, view.address)} target="_blank" rel="noopener noreferrer">
            Wallet <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

function Layout({ view, tips, disabledReason }: { view: View; tips: ReactNode; disabledReason?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Profile view={view} />
        <section className="card p-6">
          <h2 className="display text-lg font-semibold">Recent tips</h2>
          <p className="mb-2 text-sm text-[color:var(--muted)]">Public records from Arc Testnet.</p>
          {tips}
        </section>
      </div>
      <div className="lg:sticky lg:top-36 lg:self-start">
        <TipCard creator={view} disabledReason={disabledReason} />
      </div>
    </div>
  )
}

/** Contract not deployed: render the page layout from a local draft (or a bare handle), clearly marked as demo. */
function DemoCreatorPage({ handle }: { handle: string }) {
  const draft = findDraftByHandle(handle)
  const view: View = {
    handle,
    displayName: draft?.displayName ?? '',
    bio: draft?.bio ?? '',
    avatarUrl: draft?.avatarUrl ?? '',
  }
  return (
    <>
      <DemoBanner>
        {draft
          ? 'This page is built from a draft saved in this browser. It is not published, tips cannot be sent, and there are no real records.'
          : 'This is how a creator page will look. This handle is not registered, tips cannot be sent, and there are no real records.'}
      </DemoBanner>
      <Layout
        view={view}
        disabledReason="Demo only. Sending tips opens once the contract is deployed."
        tips={
          <EmptyState
            title="No onchain tips to show"
            body="Real tips will be listed here after the contract is live. Nothing is simulated."
          />
        }
      />
    </>
  )
}

function LiveCreatorPage({ handle }: { handle: string }) {
  const lookup = useCreatorByHandle(handle)
  const creator = lookup.status === 'found' ? lookup.creator : undefined
  const history = useTipHistory({ creator: creator?.address })

  return (
    <>
      {lookup.status === 'loading' && <div className="card h-80 animate-pulse" aria-busy />}
      {lookup.status === 'error' && <EmptyState title="Could not load this page" body={lookup.message} />}
      {lookup.status === 'not-found' && (
        <EmptyState
          title={`@${handle} is not claimed`}
          body="No creator has registered this username yet. If it is yours, you can claim it by creating a profile."
          action={
            <Link to="/create-profile" className="btn-primary mt-2">
              Create profile
            </Link>
          }
        />
      )}
      {creator && (
        <Layout
          view={{ ...creator, totals: { total: creator.totalReceived, count: creator.tipCount } }}
          tips={
            <TipList
              history={history}
              perspective="creator"
              emptyTitle="No tips yet"
              emptyBody="Be the first to support this creator."
            />
          }
        />
      )}
    </>
  )
}

export function CreatorPage({ handle }: { handle: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {ARCTIP_ADDRESS ? <LiveCreatorPage handle={handle} /> : <DemoCreatorPage handle={handle} />}
    </div>
  )
}
