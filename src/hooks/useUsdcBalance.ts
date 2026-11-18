import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { ARC_CHAIN_ID, USDC_ADDRESS } from '@/lib/arctip'

/** The wallet's USDC balance (ERC-20 view, 6 decimals) on Arc Testnet. */
export function useUsdcBalance() {
  const { address } = useAccount()
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  })
}
