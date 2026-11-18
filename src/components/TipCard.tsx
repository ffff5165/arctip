import { useMemo, useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { CheckCircle2 } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import type { Address } from 'viem'
import { useTip } from '@/hooks/useTip'
import { useUsdcBalance } from '@/hooks/useUsdcBalance'
import { ARCTIP_ADDRESS, ARC_CHAIN_ID, LIMITS, QUICK_TIPS, USDC_DECIMALS, arcTipAbi } from '@/lib/arctip'
import { Amount, AmountError, formatUsdc, parseUsdc } from '@/onchain-money'
import { Spinner, TxLink } from '@/components/ui'

function parseAmountInput(value: string): bigint | null {
  if (!value) return null
  try {
    const raw = parseUsdc(value)
    return raw > 0n ? raw : null
  } catch (error) {
    if (error instanceof AmountError) return null
    throw error
  }
}

export interface TipTarget {
  handle: string
  displayName: string
  /** Missing while the page is only a demo preview. */
  address?: Address
}

export function TipCard({ creator, disabledReason }: { creator: TipTarget; disabledReason?: string }) {
  const { address, isConnected } = useAccount()
  const balance = useUsdcBalance()
  const { state, send, reset } = useTip()
  const [amount, setAmount] = useState('5')
  const [message, setMessage] = useState('')

  const minTip = useReadContract({
    address: ARCTIP_ADDRESS,
    abi: arcTipAbi,
    functionName: 'minTip',
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(ARCTIP_ADDRESS) },
  })

  const raw = useMemo(() => parseAmountInput(amount), [amount])
  const isSelf = Boolean(address && creator.address && address.toLowerCase() === creator.address.toLowerCase())
  const busy = ['switching', 'approving', 'approval-confirming', 'tipping', 'confirming'].includes(state.phase)

  let problem: string | null = null
  if (amount && raw === null) problem = 'Enter a valid amount.'
  else if (raw !== null && minTip.data !== undefined && raw < minTip.data) problem = `Minimum tip is ${formatUsdc(minTip.data)} USDC.`
  else if (raw !== null && balance.data !== undefined && raw > balance.data) problem = 'More than your USDC balance.'
  else if (isSelf) problem = 'You cannot tip your own page.'

  const ctaLabel: Record<string, string> = {
    switching: 'Switching network...',
    approving: 'Approve USDC in your wallet...',
    'approval-confirming': 'Confirming approval...',
    tipping: 'Confirm tip in your wallet...',
    confirming: 'Confirming tip...',
  }

  if (state.phase === 'success') {
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[color:var(--success)]" />
        <h3 className="display mt-3 text-xl font-semibold">Tip sent</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {amount} USDC went straight to {creator.displayName || `@${creator.handle}`}.
        </p>
        <div className="mt-3">{state.txHash && <TxLink hash={state.txHash} />}</div>
        <button className="btn-ghost mt-5" onClick={reset}>
          Send another
        </button>
      </div>
    )
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="display text-lg font-semibold">Send a tip</h2>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--muted)]">
          <TokenUSDC variant="branded" size={16} /> USDC on Arc Testnet
        </span>
      </div>

      <div className="inner mt-4 p-4">
        <label htmlFor="tip-amount" className="label">
          Amount
        </label>
        <div className="mt-1 flex items-baseline gap-2">
          <input
            id="tip-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              const next = event.target.value.replace(/[^0-9.]/g, '')
              if (/^\d*\.?\d{0,6}$/.test(next)) setAmount(next)
            }}
            placeholder="0.00"
            className="display w-full bg-transparent text-4xl font-bold tabular-nums text-navy-900 outline-none placeholder:text-slate-300"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {QUICK_TIPS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setAmount(quick)}
                className={`min-h-9 rounded-full px-3.5 text-xs font-semibold tabular-nums transition-colors ${
                  amount === quick ? 'bg-navy-900 text-white' : 'bg-white text-navy-800 ring-1 ring-[color:var(--border)] hover:bg-brand-soft'
                }`}
              >
                ${quick}
              </button>
            ))}
          </div>
          {isConnected && (
            <span className="text-xs text-[color:var(--muted)]">
              Balance:{' '}
              <span className="tabular-nums">
                {balance.data !== undefined ? Amount.fromRaw(balance.data, USDC_DECIMALS).toFixed(2) : '...'} USDC
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="tip-message" className="label">
          Message (optional)
        </label>
        <textarea
          id="tip-message"
          rows={2}
          maxLength={LIMITS.messageMax}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Say thanks. Messages are public onchain."
          className="field mt-1 resize-none"
        />
        <p className="mt-1 text-right text-xs tabular-nums text-[color:var(--subtle)]">
          {new TextEncoder().encode(message).length}/{LIMITS.messageMax}
        </p>
      </div>

      {problem && <p className="mt-2 text-sm text-[color:var(--danger)]">{problem}</p>}
      {state.phase === 'error' && state.error && <p className="mt-2 text-sm text-[color:var(--danger)]">{state.error}</p>}

      <div className="mt-4">
        {disabledReason ? (
          <button className="btn-primary w-full" disabled>
            Tipping unavailable in demo
          </button>
        ) : isConnected ? (
          <button
            className="btn-primary w-full"
            disabled={busy || raw === null || problem !== null || !creator.address}
            onClick={() => raw !== null && creator.address && void send(creator.address, raw, message)}
          >
            {busy ? <Spinner>{ctaLabel[state.phase]}</Spinner> : `Send ${amount || '0'} USDC`}
          </button>
        ) : (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button className="btn-primary w-full" onClick={show}>
                Connect wallet to tip
              </button>
            )}
          </ConnectKitButton.Custom>
        )}
      </div>

      {disabledReason && <p className="mt-3 text-center text-xs font-medium text-amber-800">{disabledReason}</p>}
      {busy && state.txHash && (
        <div className="mt-3 text-center">
          <TxLink hash={state.txHash} label="Track transaction" />
        </div>
      )}
      <p className="mt-3 text-center text-xs text-[color:var(--subtle)]">
        Tips go directly to the creator. Test USDC only, no real value.
      </p>
    </div>
  )
}
