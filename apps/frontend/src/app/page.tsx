import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe2,
  Layers3,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

const bundles = [
  { data: "1 GB", validity: "7 days", price: "2.40 XLM" },
  { data: "3 GB", validity: "30 days", price: "6.80 XLM" },
  { data: "10 GB", validity: "30 days", price: "18.20 XLM" },
];

export default function Page() {
  return (
    <main className="stell-page overflow-hidden bg-[#f6f9f5] text-[#14211d]">
      <nav className="relative z-20 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#163e34] text-white shadow-sm">
            <Sparkles size={18} />
          </span>
          <span className="text-lg">Stell-Optics</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-[#51615c] md:flex">
          <a href="#how-it-works" className="hover:text-[#163e34]">How it works</a>
          <a href="#features" className="hover:text-[#163e34]">Features</a>
          <a href="#network" className="hover:text-[#163e34]">Network</a>
        </div>
        <Link
          href="/login"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#163e34]/20 bg-white px-4 text-sm font-semibold shadow-sm transition hover:border-[#163e34]/50"
        >
          Sign in <ArrowRight size={15} />
        </Link>
      </nav>

      <section className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-14 px-5 py-14 md:px-8 lg:grid-cols-[1fr_0.88fr] lg:py-20">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#2d6a58]/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#315f53] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#2f9d72]" />
            Built for everyday utility on Stellar
          </div>
          <h1 className="max-w-[760px] text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-[76px]">
            Turn XLM into <span className="text-[#2d725d]">mobile data.</span>
          </h1>
          <p className="stell-brand-serif mt-7 max-w-xl text-xl leading-8 text-[#596862]">
            A simpler way to pay for mobile data with Stellar, connecting fast blockchain settlement to everyday connectivity.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#163e34] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(22,62,52,.18)] transition hover:bg-[#215647]">
              Get started <ArrowRight size={17} />
            </Link>
            <a href="#how-it-works" className="inline-flex h-12 items-center rounded-full px-5 text-sm font-semibold text-[#315f53] hover:bg-white">
              See how it works
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#65736e]">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#2d725d]" /> Non-custodial</span>
            <span className="flex items-center gap-2"><Zap size={16} className="text-[#2d725d]" /> Stellar settlement</span>
            <span className="flex items-center gap-2"><Smartphone size={16} className="text-[#2d725d]" /> Mobile-first</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] lg:mr-0">
          <div className="absolute -inset-12 rounded-full bg-[#b8d7c5]/35 blur-3xl" />
          <div className="relative rounded-[28px] border border-white/70 bg-white/80 p-3 shadow-[0_30px_80px_rgba(31,67,56,.18)] backdrop-blur-xl">
            <div className="rounded-[22px] border border-[#dce6e1] bg-[#fbfcfb] p-5 sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a8984]">Buy data</p>
                  <h2 className="mt-1 text-xl font-semibold">Choose your bundle</h2>
                </div>
                <span className="rounded-full bg-[#e7f5ed] px-3 py-1 text-xs font-semibold text-[#287256]">Testnet</span>
              </div>
              <div className="mt-6 grid grid-cols-[1fr_auto] gap-3">
                <button className="stell-field flex h-12 items-center justify-between rounded-lg px-4 text-left text-sm font-medium">
                  United Kingdom <ChevronDown size={16} />
                </button>
                <button className="stell-field grid h-12 w-12 place-items-center rounded-lg" aria-label="Mobile network">
                  <RadioTower size={19} />
                </button>
              </div>
              <label className="mt-3 block">
                <span className="sr-only">Phone number</span>
                <input className="stell-field h-12 w-full rounded-lg px-4 text-sm" value="+44 7911 123456" readOnly />
              </label>
              <div className="mt-5 space-y-2">
                {bundles.map((bundle, index) => (
                  <div key={bundle.data} className={`flex items-center justify-between rounded-xl border p-3.5 transition ${index === 1 ? "border-[#2f725b] bg-[#edf7f1] ring-1 ring-[#2f725b]/10" : "border-[#e1e7e4] bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-full ${index === 1 ? "bg-[#163e34] text-white" : "bg-[#eef2f0] text-[#597069]"}`}><Smartphone size={16} /></span>
                      <div><p className="text-sm font-semibold">{bundle.data}</p><p className="mt-0.5 text-xs text-[#788680]">Valid for {bundle.validity}</p></div>
                    </div>
                    <span className="text-sm font-semibold">{bundle.price}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#e6ebe8] pt-4 text-sm">
                <span className="text-[#73817c]">Network fee</span><span className="font-medium">Included</span>
              </div>
              <button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#163e34] text-sm font-semibold text-white shadow-sm">
                <Wallet size={17} /> Pay securely with XLM
              </button>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-6 hidden items-center gap-3 rounded-xl border border-[#e1e7e4] bg-white px-4 py-3 shadow-lg sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#dff3e6] text-[#287256]"><Check size={16} /></span>
            <div><p className="text-xs text-[#82908b]">Transaction</p><p className="text-sm font-semibold">Verified on Stellar</p></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#dde6e1] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2d725d]">Simple by design</p>
              <h2 className="mt-4 max-w-md text-4xl font-semibold tracking-[-0.03em]">From wallet to data in a few clear steps.</h2>
            </div>
            <p className="stell-brand-serif max-w-xl text-lg leading-8 text-[#65736e] lg:justify-self-end">Every purchase connects an on-chain Stellar payment with a separate, confirmed mobile data delivery.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-[#dfe6e2] bg-[#dfe6e2] md:grid-cols-4">
            {[
              ["01", "Choose", "Select your country, network, number and data bundle."],
              ["02", "Quote", "Review the XLM price and applicable network fees."],
              ["03", "Approve", "Sign and submit payment from your Stellar wallet."],
              ["04", "Confirm", "Verify the payment, then track your data delivery."],
            ].map(([number, title, copy]) => (
              <article key={number} className="min-h-56 bg-white p-7">
                <span className="text-xs font-semibold text-[#9ba7a2]">{number}</span>
                <h3 className="mt-9 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#697771]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <article className="stell-feature border-t border-[#1f4a3e] pt-7">
            <LockKeyhole className="text-[#2d725d]" />
            <h2 className="mt-12 text-2xl font-semibold">You stay in control</h2>
            <p className="mt-4 leading-7 text-[#65736e]">Non-custodial wallet interactions. No seed phrases, private keys, or surprises.</p>
          </article>
          <article className="stell-feature border-t border-[#1f4a3e] pt-7">
            <ShieldCheck className="text-[#2d725d]" />
            <h2 className="mt-12 text-2xl font-semibold">Payment is verified</h2>
            <p className="mt-4 leading-7 text-[#65736e]">The backend independently checks transaction status, amount, and destination.</p>
          </article>
          <article className="stell-feature border-t border-[#1f4a3e] pt-7">
            <Layers3 className="text-[#2d725d]" />
            <h2 className="mt-12 text-2xl font-semibold">Delivery stays transparent</h2>
            <p className="mt-4 leading-7 text-[#65736e]">Payment and fulfillment are tracked separately, with clear receipts and status history.</p>
          </article>
        </div>
      </section>

      <section id="network" className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="relative overflow-hidden rounded-lg bg-[#163e34] px-6 py-10 text-white md:px-12 md:py-14">
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 stell-orbit" />
          <div className="relative grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <Globe2 className="mb-8 text-[#8ed3b4]" />
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">Made for wider access.</h2>
              <p className="mt-4 max-w-xl leading-7 text-[#c7d7d1]">Built to expand across countries, mobile networks, providers, and everyday digital services, while keeping Stellar at the core.</p>
            </div>
            <Link href="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#163e34]">
              Explore Stell-Optics <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
