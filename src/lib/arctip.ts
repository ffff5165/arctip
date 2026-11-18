import { isAddress, type Address } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getUsdc, requireChain } from '@/onchain-facts'
import { usdcDecimalsFor } from '@/onchain-money'

/**
 * ArcTip contract surface (PROPOSED interface, see docs/contract-design.md).
 * The contract is not deployed yet: VITE_ARCTIP_ADDRESS stays empty until it is.
 */

export const ARC_CHAIN_ID = arcTestnet.id
export const ARC_CHAIN = requireChain(ARC_CHAIN_ID)

const usdcFact = getUsdc(ARC_CHAIN_ID)
if (!usdcFact) throw new Error('USDC is not registered for Arc Testnet')
export const USDC_ADDRESS = usdcFact.address as Address
export const USDC_DECIMALS = usdcDecimalsFor(ARC_CHAIN_ID)

const rawAddress = import.meta.env.VITE_ARCTIP_ADDRESS as string | undefined
export const ARCTIP_ADDRESS: Address | undefined =
  rawAddress && isAddress(rawAddress) ? rawAddress : undefined

const rawBlock = import.meta.env.VITE_ARCTIP_DEPLOY_BLOCK as string | undefined
export const ARCTIP_DEPLOY_BLOCK: bigint | undefined =
  rawBlock && /^\d+$/.test(rawBlock) ? BigInt(rawBlock) : undefined

export const LIMITS = {
  handleMin: 3,
  handleMax: 32,
  nameMax: 48,
  bioMax: 280,
  avatarMax: 200,
  messageMax: 140,
} as const

export const HANDLE_PATTERN = /^[a-z0-9_]{3,32}$/

export const QUICK_TIPS = ['1', '5', '10', '25'] as const

export const arcTipAbi = [
  {
    type: 'function',
    name: 'registerCreator',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'handle', type: 'string' },
      { name: 'displayName', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'avatarUrl', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateProfile',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'displayName', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'avatarUrl', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'tip',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getCreator',
    stateMutability: 'view',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'handle', type: 'string' },
          { name: 'displayName', type: 'string' },
          { name: 'bio', type: 'string' },
          { name: 'avatarUrl', type: 'string' },
          { name: 'registeredAt', type: 'uint64' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'creatorOfHandle',
    stateMutability: 'view',
    inputs: [{ name: 'handle', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'isRegistered',
    stateMutability: 'view',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'totalReceived',
    stateMutability: 'view',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tipCount',
    stateMutability: 'view',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'minTip',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'CreatorRegistered',
    inputs: [
      { name: 'creator', type: 'address', indexed: true },
      { name: 'handle', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Tipped',
    inputs: [
      { name: 'creator', type: 'address', indexed: true },
      { name: 'supporter', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'message', type: 'string', indexed: false },
    ],
  },
] as const

export function validateHandle(value: string): string | null {
  if (!value) return null
  if (value.length < LIMITS.handleMin) return `Use at least ${LIMITS.handleMin} characters.`
  if (value.length > LIMITS.handleMax) return `Use at most ${LIMITS.handleMax} characters.`
  if (!HANDLE_PATTERN.test(value)) return 'Lowercase letters, numbers and underscores only.'
  return null
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
