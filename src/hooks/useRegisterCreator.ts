import { useCallback, useState } from 'react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import type { Hash } from 'viem'
import { ARCTIP_ADDRESS, ARC_CHAIN_ID, arcTipAbi } from '@/lib/arctip'
import { isUserRejection, parseOnchainError } from '@/lib/errors'

export interface RegisterState {
  phase: 'idle' | 'signing' | 'confirming' | 'success' | 'error'
  txHash?: Hash
  error?: string
}

export interface ProfileInput {
  handle: string
  displayName: string
  bio: string
  avatarUrl: string
}

/** Creates (registerCreator) or edits (updateProfile) a creator profile onchain. */
export function useRegisterCreator(onDone?: () => void) {
  const { chainId } = useAccount()
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [state, setState] = useState<RegisterState>({ phase: 'idle' })

  const run = useCallback(
    async (send: () => Promise<Hash>) => {
      if (!ARCTIP_ADDRESS || !client) return
      try {
        if (chainId !== ARC_CHAIN_ID) await switchChainAsync({ chainId: ARC_CHAIN_ID })
        setState({ phase: 'signing' })
        const hash = await send()
        setState({ phase: 'confirming', txHash: hash })
        const receipt = await client.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new Error('Transaction reverted')
        setState({ phase: 'success', txHash: hash })
        onDone?.()
      } catch (error) {
        if (isUserRejection(error)) {
          setState({ phase: 'idle' })
          return
        }
        setState({ phase: 'error', error: parseOnchainError(error) })
      }
    },
    [chainId, client, onDone, switchChainAsync],
  )

  const register = useCallback(
    (input: ProfileInput) => {
      const address = ARCTIP_ADDRESS
      if (!address) return Promise.resolve()
      return run(() =>
        writeContractAsync({
          address,
          abi: arcTipAbi,
          functionName: 'registerCreator',
          args: [input.handle, input.displayName, input.bio, input.avatarUrl],
          chainId: ARC_CHAIN_ID,
        }),
      )
    },
    [run, writeContractAsync],
  )

  const update = useCallback(
    (input: ProfileInput) => {
      const address = ARCTIP_ADDRESS
      if (!address) return Promise.resolve()
      return run(() =>
        writeContractAsync({
          address,
          abi: arcTipAbi,
          functionName: 'updateProfile',
          args: [input.displayName, input.bio, input.avatarUrl],
          chainId: ARC_CHAIN_ID,
        }),
      )
    },
    [run, writeContractAsync],
  )

  return { state, register, update }
}
