import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ArrowRight, ExternalLink, Pencil } from 'lucide-react'
import { useMyCreator } from '@/hooks/useCreator'
import { useTipHistory } from '@/hooks/useTipHistory'
import { ARCTIP_ADDRESS } from '@/lib/arctip'
import { useDraft, type ProfileDraft } from '@/lib/draft'
import { Link } from '@/lib/router'
import { buildShareLink } from '@/lib/share'
import { Avatar, CopyButton, DemoBanner, EmptyState, PageHeader, UsdcAmount } from '@/components/ui'
import { TxTable } from '@/components/TxTable'

function Stat({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <p className="label">{label}</p>
      <p className="display mt-2 text-3xl font-bold tabular-nums text-navy-900">{children}</p>
      {hint && <p className="mt-1 text-xs text-[color:var(--subtle)]">{hint}</p>}
    </div>
  )
}

const NONE = <span className="text-[color:var(--subtle)]">&mdash;</span>

interface ViewProps {
  profile: ProfileDraft
  wallet: `0x${string}`
  /** Onchain totals. Undefined while the profile is only a local draft. */
  totals?: { total: bigint; count: bigint }
}

function DashboardView({ profile, wallet, totals }: ViewProps) {
  const published = totals !== undefined
  const history = useTipHistory({ creator: published ? wallet : undefined })
  const [shareUrl, setShareUrl] = useState('')
  useEffect(() => {
    void buildShareLink(`/c/${profile.handle}`).then(setShareUrl)
  }, [profile.handle])

  const supporters = useMemo(() => {
    if (!history.data) return undefined
    return new Set(history.data.entries.map((tip) => tip.supporter.toLowerCase())).size
  }, [history.data])

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar key={profile.avatarUrl} name={profile.displayName || profile.handle} url={profile.avatarUrl} size={64} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="display break-words text-2xl font-bold text-navy-900">{profile.displayName}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    published ? 'bg-emerald-50 text-[color:var(--success)]' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {published ? 'Published onchain' : 'Local draft'}
                </span>
              </div>
              <p className="text-sm text-[color:var(--muted)]">@{profile.handle}</p>
              {profile.bio && <p className="mt-2 max-w-xl break-words text-pretty text-sm text-[color:var(--ink-2)]">{profile.bio}</p>}
            </div>
          </div>
          <Link to="/create-profile" className="btn-ghost shrink-0 self-start lg:self-center">
            <Pencil className="size-4" /> Edit profile
          </Link>
        </div>

        <div className="inner mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="label">Your tipping link{published ? '' : ' (draft)'}</p>
            <p className="mono mt-1 break-all text-xs text-navy-800 sm:text-sm">{shareUrl || 'Preparing link...'}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <CopyButton value={shareUrl} label="Copy link" />
            <Link to={`/c/${profile.handle}`} className="btn-primary">
              Open page <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {!published && (
        <DemoBanner>
          Your profile is a draft saved on this device. Totals and transactions below stay empty until the contract is deployed and you
          publish.
        </DemoBanner>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total tips (USDC)" hint={published ? undefined : 'Available once published'}>
          {totals ? <UsdcAmount raw={totals.total} /> : NONE}
        </Stat>
        <Stat label="Tips received" hint={published ? undefined : 'Available once published'}>
          {totals ? totals.count.toString() : NONE}
        </Stat>
        <Stat
          label="Supporters"
          hint={published && history.data && !history.data.complete ? 'Unique wallets in the scanned blocks' : published ? 'Unique wallets' : 'Available once published'}
        >
          {supporters !== undefined ? supporters : NONE}
        </Stat>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="display text-lg font-semibold">Recent transactions</h2>
            <p className="text-sm text-[color:var(--muted)]">Latest tips straight from Arc Testnet.</p>
          </div>
          <Link to="/history" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <TxTable
          history={history}
          counterparty="sender"
          limit={5}
          unavailable={!published}
          emptyTitle={published ? 'No tips yet' : 'No transactions to show'}
          emptyBody={
            published
              ? 'Share your tipping link. New tips appear here as soon as they confirm.'
              : 'Real transactions appear here after your profile is published onchain.'
          }
        />
      </section>
    </div>
  )
}

export function Dashboard() {
  const { address, isConnected } = useAccount()
  const mine = useMyCreator(address)
  const { draft } = useDraft(address)
  const live = Boolean(ARCTIP_ADDRESS)

  let body: ReactNode
  if (!isConnected || !address) {
    body = (
      <EmptyState
        title="Connect your wallet"
        body="Your dashboard shows the profile and tips tied to your wallet on Arc Testnet."
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
    )
  } else if (live && mine.status === 'loading') {
    body = <div className="card h-64 animate-pulse" aria-busy />
  } else if (live && mine.status === 'error') {
    body = <EmptyState title="Could not load your dashboard" body={mine.message} />
  } else if (live && mine.status === 'found') {
    const { handle, displayName, bio, avatarUrl, totalReceived, tipCount } = mine.creator
    body = (
      <DashboardView
        profile={{ handle, displayName, bio, avatarUrl }}
        wallet={address}
        totals={{ total: totalReceived, count: tipCount }}
      />
    )
  } else if (!live && draft) {
    body = <DashboardView profile={draft} wallet={address} />
  } else {
    body = (
      <EmptyState
        title="You have no creator profile yet"
        body="Create a profile to get your own tipping link. It only takes a minute."
        action={
          <Link to="/create-profile" className="btn-primary mt-2">
            Create profile <ArrowRight className="size-4" />
          </Link>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Creator dashboard" subtitle="Your profile, tipping link and the tips you have received." />
      {(!isConnected || (!live && !draft)) && <DemoBanner />}
      {body}
    </div>
  )
}
