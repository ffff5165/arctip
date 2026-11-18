import { useReadContract } from 'wagmi'
import { zeroAddress, type Address } from 'viem'
import { ARCTIP_ADDRESS, ARC_CHAIN_ID, arcTipAbi } from '@/lib/arctip'

export interface CreatorProfile {
  address: Address
  handle: string
  displayName: string
  bio: string
  avatarUrl: string
  registeredAt: bigint
  totalReceived: bigint
  tipCount: bigint
}

export type CreatorLookup =
  | { status: 'no-contract' }
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'found'; creator: CreatorProfile }

const base = { address: ARCTIP_ADDRESS, abi: arcTipAbi, chainId: ARC_CHAIN_ID } as const
const refetchInterval = 15_000

/** Reads a creator profile plus live totals from the contract, by wallet address. */
function useProfileByAddress(creator: Address | undefined): CreatorLookup {
  const enabled = Boolean(ARCTIP_ADDRESS && creator)
  const profile = useReadContract({
    ...base,
    functionName: 'getCreator',
    args: creator ? [creator] : undefined,
    query: { enabled, refetchInterval },
  })
  const total = useReadContract({
    ...base,
    functionName: 'totalReceived',
    args: creator ? [creator] : undefined,
    query: { enabled, refetchInterval },
  })
  const count = useReadContract({
    ...base,
    functionName: 'tipCount',
    args: creator ? [creator] : undefined,
    query: { enabled, refetchInterval },
  })

  if (!ARCTIP_ADDRESS) return { status: 'no-contract' }
  if (!creator) return { status: 'not-found' }
  if (profile.isError) return { status: 'error', message: 'Could not read this creator from Arc Testnet.' }
  if (profile.isLoading || total.isLoading || count.isLoading || !profile.data) return { status: 'loading' }
  if (!profile.data.handle) return { status: 'not-found' }

  return {
    status: 'found',
    creator: {
      address: creator,
      handle: profile.data.handle,
      displayName: profile.data.displayName,
      bio: profile.data.bio,
      avatarUrl: profile.data.avatarUrl,
      registeredAt: profile.data.registeredAt,
      totalReceived: total.data ?? 0n,
      tipCount: count.data ?? 0n,
    },
  }
}

/** Resolves /c/:handle to a creator. */
export function useCreatorByHandle(handle: string): CreatorLookup {
  const owner = useReadContract({
    ...base,
    functionName: 'creatorOfHandle',
    args: [handle],
    query: { enabled: Boolean(ARCTIP_ADDRESS), refetchInterval },
  })
  const resolved = owner.data && owner.data !== zeroAddress ? owner.data : undefined
  const lookup = useProfileByAddress(resolved)

  if (!ARCTIP_ADDRESS) return { status: 'no-contract' }
  if (owner.isError) return { status: 'error', message: 'Could not reach Arc Testnet.' }
  if (owner.isLoading) return { status: 'loading' }
  if (!resolved) return { status: 'not-found' }
  return lookup
}

/** The connected wallet's own creator profile (dashboard). */
export function useMyCreator(wallet: Address | undefined): CreatorLookup {
  return useProfileByAddress(wallet)
}
