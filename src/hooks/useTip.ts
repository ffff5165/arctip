import { useCallback, useState } from 'react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { erc20Abi, type Address, type Hash } from 'viem'
import { ARCTIP_ADDRESS, ARC_CHAIN_ID, USDC_ADDRESS, arcTipAbi } from '@/lib/arctip'
import { isUserRejection, parseOnchainError } from '@/lib/errors'

export type TipPhase =
  | 'idle'
  | 'switching'
  | 'approving'
  | 'approval-confirming'
  | 'tipping'
  | 'confirming'
  | 'success'
  | 'error'

export interface TipState {
  phase: TipPhase
  txHash?: Hash
  error?: string
}

/**
 * Tip flow: (1) approve USDC to ArcTip if the allowance is short, (2) call tip().
 * Every phase comes from a real wallet or receipt event, never a timer.
 */
export function useTip() {
  const { address, chainId } = useAccount()
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [state, setState] = useState<TipState>({ phase: 'idle' })

  const reset = useCallback(() => setState({ phase: 'idle' }), [])

  const send = useCallback(
    async (creator: Address, amount: bigint, message: string) => {
      if (!ARCTIP_ADDRESS || !client || !address) return
      try {
        if (chainId !== ARC_CHAIN_ID) {
          setState({ phase: 'switching' })
          await switchChainAsync({ chainId: ARC_CHAIN_ID })
        }

        const allowance = await client.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, ARCTIP_ADDRESS],
        })

        if (allowance < amount) {
          setState({ phase: 'approving' })
          const approveHash = await writeContractAsync({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [ARCTIP_ADDRESS, amount],
            chainId: ARC_CHAIN_ID,
          })
          setState({ phase: 'approval-confirming', txHash: approveHash })
          const approval = await client.waitForTransactionReceipt({ hash: approveHash })
          if (approval.status !== 'success') throw new Error('Approval reverted')
        }

        setState({ phase: 'tipping' })
        const hash = await writeContractAsync({
          address: ARCTIP_ADDRESS,
          abi: arcTipAbi,
          functionName: 'tip',
          args: [creator, amount, message],
          chainId: ARC_CHAIN_ID,
        })
        setState({ phase: 'confirming', txHash: hash })
        const receipt = await client.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new Error('Transaction reverted')
        setState({ phase: 'success', txHash: hash })
      } catch (error) {
        if (isUserRejection(error)) {
          setState({ phase: 'idle' })
          return
        }
        setState({ phase: 'error', error: parseOnchainError(error) })
      }
    },
    [address, chainId, client, switchChainAsync, writeContractAsync],
  )

  return { state, send, reset }
}
