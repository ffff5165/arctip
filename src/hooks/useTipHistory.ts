import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { getAbiItem, type Address, type Hash } from 'viem'
import { ARCTIP_ADDRESS, ARCTIP_DEPLOY_BLOCK, ARC_CHAIN_ID, arcTipAbi } from '@/lib/arctip'

export interface TipEntry {
  txHash: Hash
  logIndex: number
  blockNumber: bigint
  creator: Address
  supporter: Address
  amount: bigint
  message: string
  timestamp?: number
}

export interface TipHistory {
  entries: TipEntry[]
  fromBlock: bigint
  headBlock: bigint
  /** True when the scan started at the contract's deployment block. */
  complete: boolean
}

const CHUNK = 2_000n
const PARALLEL = 4
const LOOKBACK = 5_000n
const MAX_ENTRIES = 100

const tippedEvent = getAbiItem({ abi: arcTipAbi, name: 'Tipped' })

/**
 * Reads Tipped events straight from Arc Testnet.
 * Starts at the deployment block when known, otherwise a bounded lookback from the head.
 */
export function useTipHistory(filter: { creator?: Address; supporter?: Address }) {
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })

  return useQuery<TipHistory>({
    queryKey: ['tip-history', ARCTIP_ADDRESS, filter.creator, filter.supporter],
    enabled: Boolean(client && ARCTIP_ADDRESS && (filter.creator || filter.supporter)),
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!client || !ARCTIP_ADDRESS) throw new Error('Client unavailable')
      const head = await client.getBlockNumber()
      const complete = ARCTIP_DEPLOY_BLOCK !== undefined
      const fromBlock = ARCTIP_DEPLOY_BLOCK ?? (head > LOOKBACK ? head - LOOKBACK : 0n)

      const ranges: Array<[bigint, bigint]> = []
      for (let start = fromBlock; start <= head; start += CHUNK) {
        const end = start + CHUNK - 1n
        ranges.push([start, end > head ? head : end])
      }

      const logs = []
      for (let i = 0; i < ranges.length; i += PARALLEL) {
        const batch = await Promise.all(
          ranges.slice(i, i + PARALLEL).map(([from, to]) =>
            client.getLogs({
              address: ARCTIP_ADDRESS,
              event: tippedEvent,
              args: { creator: filter.creator, supporter: filter.supporter },
              fromBlock: from,
              toBlock: to,
            }),
          ),
        )
        for (const part of batch) logs.push(...part)
      }

      const newest = logs
        .filter((log) => log.transactionHash && log.blockNumber !== null && log.logIndex !== null)
        .sort((a, b) =>
          a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : Number(b.blockNumber - a.blockNumber),
        )
        .slice(0, MAX_ENTRIES)

      const blockNumbers = [...new Set(newest.map((log) => log.blockNumber))]
      const stamps = new Map<bigint, number>()
      await Promise.all(
        blockNumbers.map(async (blockNumber) => {
          const block = await client.getBlock({ blockNumber })
          stamps.set(blockNumber, Number(block.timestamp))
        }),
      )

      const entries: TipEntry[] = newest.map((log) => ({
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
        creator: log.args.creator!,
        supporter: log.args.supporter!,
        amount: log.args.amount ?? 0n,
        message: log.args.message ?? '',
        timestamp: stamps.get(log.blockNumber),
      }))

      return { entries, fromBlock, headBlock: head, complete }
    },
  })
}
