import { useEffect, useState, type FormEvent } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { toast } from 'sonner'
import { useMyCreator } from '@/hooks/useCreator'
import { useRegisterCreator, type ProfileInput } from '@/hooks/useRegisterCreator'
import { ARCTIP_ADDRESS, ARC_CHAIN_ID, LIMITS, arcTipAbi, validateHandle } from '@/lib/arctip'
import { useDraft } from '@/lib/draft'
import { navigate } from '@/lib/router'
import { buildShareLink } from '@/lib/share'
import { Avatar, DemoBanner, EmptyState, PageHeader, Spinner, TxLink } from '@/components/ui'

const EMPTY: ProfileInput = { handle: '', displayName: '', bio: '', avatarUrl: '' }

function avatarProblem(url: string): string | null {
  if (!url) return null
  try {
    return new URL(url).protocol === 'https:' ? null : 'Use an https:// image link.'
  } catch {
    return 'Enter a valid https:// image link.'
  }
}

function Preview({ value, draftOnly }: { value: ProfileInput; draftOnly: boolean }) {
  const [resolved, setResolved] = useState<{ handle: string; url: string } | null>(null)
  const handleOk = value.handle.length > 0 && validateHandle(value.handle) === null
  useEffect(() => {
    if (!handleOk) return
    let cancelled = false
    void buildShareLink(`/c/${value.handle}`).then((url) => {
      if (!cancelled) setResolved({ handle: value.handle, url })
    })
    return () => {
      cancelled = true
    }
  }, [handleOk, value.handle])
  const link = handleOk && resolved?.handle === value.handle ? resolved.url : ''

  return (
    <aside className="card p-6 lg:sticky lg:top-36 lg:self-start" aria-label="Profile preview">
      <p className="label">Live preview</p>
      <div className="mt-4 flex items-center gap-4">
        <Avatar key={value.avatarUrl} name={value.displayName || value.handle || '?'} url={value.avatarUrl} size={64} />
        <div className="min-w-0">
          <p className="display break-words text-xl font-bold text-navy-900">{value.displayName || 'Display name'}</p>
          <p className="text-sm text-[color:var(--muted)]">@{value.handle || 'username'}</p>
        </div>
      </div>
      <p className="mt-4 whitespace-pre-line break-words text-pretty text-sm text-[color:var(--ink-2)]">
        {value.bio || 'Your short bio appears here.'}
      </p>
      <div className="inner mt-5 p-3">
        <p className="label">Your tipping link{draftOnly ? ' (draft)' : ''}</p>
        <p className="mono mt-1 break-all text-xs text-navy-800">{link || 'Choose a valid username to see your link.'}</p>
      </div>
    </aside>
  )
}

function ProfileEditor({ wallet, editing, initial }: { wallet: string; editing: boolean; initial: ProfileInput }) {
  const [value, setValue] = useState<ProfileInput>(initial)
  const { state, register, update } = useRegisterCreator(() => {
    toast.success(editing ? 'Profile updated' : 'Profile created')
    navigate('/dashboard')
  })
  const { save } = useDraft(wallet)
  const live = Boolean(ARCTIP_ADDRESS)

  const set = (key: keyof ProfileInput) => (next: string) => setValue((current) => ({ ...current, [key]: next }))

  const handleError = validateHandle(value.handle)
  const avatarError = avatarProblem(value.avatarUrl)
  const complete = !handleError && value.handle.length > 0 && value.displayName.trim().length > 0 && !avatarError

  const owner = useReadContract({
    address: ARCTIP_ADDRESS,
    abi: arcTipAbi,
    functionName: 'creatorOfHandle',
    args: [value.handle],
    chainId: ARC_CHAIN_ID,
    query: { enabled: live && !editing && complete },
  })
  const taken = Boolean(owner.data && /[1-9a-f]/i.test(owner.data.slice(2)))
  const busy = state.phase === 'signing' || state.phase === 'confirming'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!complete || taken) return
    const clean: ProfileInput = {
      handle: value.handle,
      displayName: value.displayName.trim(),
      bio: value.bio.trim(),
      avatarUrl: value.avatarUrl.trim(),
    }
    if (!live) {
      save(clean)
      toast.success('Draft saved on this device. It is not published onchain.')
      navigate('/dashboard')
      return
    }
    void (editing ? update(clean) : register(clean))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form className="card space-y-5 p-6" onSubmit={submit}>
        <div>
          <label htmlFor="displayName" className="label">
            Display name
          </label>
          <input
            id="displayName"
            className="field mt-1"
            value={value.displayName}
            maxLength={LIMITS.nameMax}
            onChange={(event) => set('displayName')(event.target.value)}
            placeholder="Your name or project"
          />
        </div>

        <div>
          <label htmlFor="handle" className="label">
            Username
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[color:var(--subtle)]">@</span>
            <input
              id="handle"
              className="field pl-8 disabled:bg-brand-mist disabled:text-[color:var(--muted)]"
              value={value.handle}
              maxLength={LIMITS.handleMax}
              disabled={editing}
              onChange={(event) => set('handle')(event.target.value.toLowerCase())}
              placeholder="yourname"
              autoComplete="off"
              autoCapitalize="none"
            />
          </div>
          <p className="mt-1 text-xs text-[color:var(--subtle)]">
            {editing
              ? 'Usernames are permanent so shared links keep working.'
              : (handleError ?? (taken ? 'That username is already taken.' : 'Lowercase letters, numbers and underscores. Permanent once published.'))}
          </p>
        </div>

        <div>
          <label htmlFor="avatar" className="label">
            Avatar image link (optional)
          </label>
          <input
            id="avatar"
            className="field mt-1"
            inputMode="url"
            value={value.avatarUrl}
            maxLength={LIMITS.avatarMax}
            onChange={(event) => set('avatarUrl')(event.target.value)}
            placeholder="https://"
          />
          <p className="mt-1 text-xs text-[color:var(--subtle)]">{avatarError ?? 'Paste a link to a square image. Initials are used if empty.'}</p>
        </div>

        <div>
          <label htmlFor="bio" className="label">
            Short bio
          </label>
          <textarea
            id="bio"
            rows={4}
            className="field mt-1 resize-none"
            value={value.bio}
            maxLength={LIMITS.bioMax}
            onChange={(event) => set('bio')(event.target.value)}
            placeholder="What do you create?"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-[color:var(--subtle)]">
            {value.bio.length}/{LIMITS.bioMax}
          </p>
        </div>

        {state.phase === 'error' && state.error && <p className="text-sm text-[color:var(--danger)]">{state.error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={!complete || taken || busy}>
          {state.phase === 'signing' ? (
            <Spinner>Confirm in your wallet...</Spinner>
          ) : state.phase === 'confirming' ? (
            <Spinner>Confirming...</Spinner>
          ) : !live ? (
            'Save draft on this device'
          ) : editing ? (
            'Save changes'
          ) : (
            'Create profile'
          )}
        </button>
        {state.phase === 'confirming' && state.txHash && (
          <div className="text-center">
            <TxLink hash={state.txHash} label="Track transaction" />
          </div>
        )}
        <p className="text-center text-xs text-[color:var(--subtle)]">
          {live
            ? 'Profile text is public and permanent onchain. Avoid personal data.'
            : 'Drafts stay in this browser only. Publishing onchain opens once the contract is deployed.'}
        </p>
      </form>
      <Preview value={value} draftOnly={!live} />
    </div>
  )
}

export function CreateProfilePage() {
  const { address, isConnected } = useAccount()
  const mine = useMyCreator(address)
  const { draft } = useDraft(address)

  const editing = mine.status === 'found'
  let initial = EMPTY
  if (mine.status === 'found') {
    const { handle, displayName, bio, avatarUrl } = mine.creator
    initial = { handle, displayName, bio, avatarUrl }
  } else if (!ARCTIP_ADDRESS && draft) {
    initial = draft
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={editing ? 'Edit your profile' : 'Create your profile'}
        subtitle="Set the name, username, avatar and bio supporters see on your tipping page."
      />
      <DemoBanner>You can fill in this form and save a draft on this device. Nothing is published to Arc Testnet yet.</DemoBanner>

      {!isConnected ? (
        <EmptyState
          title="Connect your wallet"
          body="Your profile belongs to your wallet. Connect one on Arc Testnet to continue."
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
      ) : mine.status === 'loading' ? (
        <div className="card h-96 animate-pulse" aria-busy />
      ) : mine.status === 'error' ? (
        <EmptyState title="Could not check your profile" body={mine.message} />
      ) : (
        <ProfileEditor key={`${address}-${editing}-${initial.handle}`} wallet={address ?? ''} editing={editing} initial={initial} />
      )}
    </div>
  )
}
