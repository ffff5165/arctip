import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Link2, ShieldCheck, Wallet, Zap, ReceiptText, Search } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { Link, navigate } from '@/lib/router'
import { HANDLE_PATTERN, QUICK_TIPS } from '@/lib/arctip'

function HeroPreview() {
  return (
    <div className="card relative w-full max-w-sm p-5" aria-label="Example tip card">
      <div className="flex items-center gap-3">
        <div className="display flex size-12 items-center justify-center rounded-full bg-navy-900 text-base font-semibold text-white">
          YN
        </div>
        <div>
          <p className="display text-base font-semibold">Your name</p>
          <p className="text-xs text-[color:var(--muted)]">/c/yourname</p>
        </div>
      </div>
      <div className="inner mt-5 p-4">
        <p className="label">Tip amount</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="display text-4xl font-bold tabular-nums text-navy-900">5.00</span>
          <span className="text-sm font-medium text-[color:var(--subtle)]">USDC</span>
        </div>
        <div className="mt-3 flex gap-2">
          {QUICK_TIPS.map((amount, index) => (
            <span
              key={amount}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums ${
                index === 1 ? 'bg-navy-900 text-white' : 'bg-white text-navy-800 ring-1 ring-[color:var(--border)]'
              }`}
            >
              ${amount}
            </span>
          ))}
        </div>
      </div>
      <div className="btn-primary mt-4 w-full">Send tip</div>
      <p className="mt-3 text-center text-xs text-[color:var(--subtle)]">Example layout of a creator page</p>
    </div>
  )
}

function FindCreator() {
  const [value, setValue] = useState('')
  const handle = value.trim().replace(/^@/, '').toLowerCase()
  const valid = HANDLE_PATTERN.test(handle)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) navigate(`/c/${handle}`)
  }

  return (
    <form onSubmit={submit} className="mt-8 flex max-w-md items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--subtle)]" />
        <input
          className="field pl-10"
          placeholder="Find a creator by handle"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Creator handle"
        />
      </div>
      <button type="submit" className="btn-primary" disabled={!valid}>
        Go
      </button>
    </form>
  )
}

const features = [
  { icon: Link2, title: 'A page that is yours', body: 'Claim a handle and share one link. Supporters land on a clean page built for tipping.' },
  { icon: Zap, title: 'Tips in USDC', body: 'Supporters send USDC on Arc, with fees paid in USDC too. Nothing else to buy.' },
  { icon: ShieldCheck, title: 'Straight to your wallet', body: 'Tips go from the supporter to you in one transaction. ArcTip never holds your money.' },
  { icon: ReceiptText, title: 'History you can verify', body: 'Every tip is a public onchain record. Check any transaction on the block explorer.' },
]

const steps = [
  { icon: Wallet, title: 'Connect your wallet', body: 'Use any browser wallet on Arc Testnet.' },
  { icon: Link2, title: 'Claim your handle', body: 'Set a name and bio, then share your tipping link.' },
  { icon: ReceiptText, title: 'Receive and track tips', body: 'Watch totals and tip records update in your dashboard.' },
]

export function Landing() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-mist to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-navy-800">
              <TokenUSDC variant="branded" size={14} /> USDC tipping on Arc Testnet
            </span>
            <h1 className="display mt-5 text-balance text-5xl font-bold leading-[1.05] text-navy-900 sm:text-6xl">
              Get tipped in USDC, with one simple link.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-[color:var(--muted)]">
              ArcTip gives every creator a personal tipping page. Supporters send USDC straight to your wallet, and every tip is recorded onchain.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/create-profile" className="btn-primary">
                Create your page <ArrowRight className="size-4" />
              </Link>
              <a href="#how-it-works" className="btn-ghost">
                How it works
              </a>
            </div>
            <FindCreator />
          </motion.div>
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="display max-w-xl text-balance text-3xl font-bold text-navy-900">Built for creators and the people who back them</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </div>
              <h3 className="display mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-pretty text-sm text-[color:var(--muted)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="display text-3xl font-bold">How it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#acc6e9]">
                    <Icon className="size-5" />
                  </div>
                  <span className="display text-sm font-semibold text-[#acc6e9]">0{index + 1}</span>
                </div>
                <h3 className="display mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-pretty text-sm text-slate-300">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="display text-2xl font-bold text-navy-900">Ready to claim your handle?</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Connect a wallet on Arc Testnet and set up your page in a minute.</p>
          </div>
          <Link to="/create-profile" className="btn-primary">
            Create profile <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
