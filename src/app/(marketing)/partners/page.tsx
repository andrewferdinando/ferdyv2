import type { Metadata } from 'next'
import {
  ArrowDown,
  ArrowRight,
  Check,
  X,
  Mail,
  Infinity as InfinityIcon,
  Calendar,
  Settings2,
  Rotate3d,
  Clock,
} from 'lucide-react'
import PartnerRegistrationForm from './PartnerRegistrationForm'

export const metadata: Metadata = {
  title: 'Partner Programme',
  description: 'Earn 20% lifetime commission on every Ferdy customer you introduce.',
  robots: { index: false, follow: false },
}

const PORTRAIT_SRC = '/images/andrew-headshot.jpg'

export default function PartnersPage() {
  return (
    <div className="bg-white">
      {/* Hero - personal, portrait + invitation */}
      <section className="relative pt-28 md:pt-36 pb-20 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 overflow-hidden">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Portrait (mobile: top, desktop: left) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-start">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-br from-[#6366F1]/20 to-[#4F46E5]/10 rounded-3xl blur-xl" />
                <img
                  src={PORTRAIT_SRC}
                  alt="Andrew Ferdinando"
                  className="relative w-56 h-56 md:w-72 md:h-72 rounded-3xl object-cover shadow-xl ring-4 ring-white"
                />
                <div className="relative mt-4 text-center lg:text-left">
                  <p className="font-semibold text-gray-900">Andrew Ferdinando</p>
                  <p className="text-sm text-gray-500">Founder, Ferdy</p>
                </div>
              </div>
            </div>

            {/* Copy + CTAs */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-5 leading-[1.15]">
                Know a business that&rsquo;d love Ferdy?{' '}
                <span className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] bg-clip-text text-transparent">
                  Let&rsquo;s work together.
                </span>
              </h1>
              <p className="text-base md:text-lg text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Hi - I&rsquo;m Andrew, the founder of Ferdy. If you know businesses or agencies anywhere in the
                world who could benefit from Ferdy, I&rsquo;d love you to introduce us. When your introduction turns
                into a customer, you earn <strong>20%</strong> of their subscription - every month, for as long
                as they stay with Ferdy.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                <a
                  href="#register"
                  className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  Become a partner
                  <ArrowDown className="w-4 h-4" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold transition-all"
                >
                  How it works
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Stat bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-gray-200/70">
                {[
                  { label: '20%', sub: 'commission' },
                  { label: 'Lifetime', sub: 'recurring' },
                  { label: '$50 NZD', sub: 'min payout' },
                  { label: 'Monthly', sub: 'paid within 7 days' },
                ].map((s) => (
                  <div key={s.label} className="text-center lg:text-left">
                    <div className="text-lg md:text-xl font-bold text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - timeline stepper */}
      <section id="how-it-works" className="py-20 scroll-mt-16">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            How it works
          </h2>
          <p className="text-lg text-gray-600 text-center mb-16 max-w-2xl mx-auto">
            From intro to payout, in four simple steps.
          </p>

          {/* Desktop: horizontal timeline. Mobile: vertical stack with left rail. */}
          <div className="relative">
            {/* Desktop connector line */}
            <div
              aria-hidden
              className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-[#6366F1] via-[#6366F1] to-[#4F46E5]"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
              {[
                {
                  title: 'Register as a partner',
                  body: 'Fill in the form below. Takes a minute, and you\u2019re in.',
                },
                {
                  title: 'Make an introduction',
                  body: 'Email me at andrew@ferdy.io with a proper intro, CC\u2019ing the prospect.',
                },
                {
                  title: 'I take it from there',
                  body: 'I\u2019ll reach out, run the demo, and handle the onboarding.',
                },
                {
                  title: 'You get paid every month',
                  body: 'For as long as the customer stays with Ferdy, you earn 20%.',
                },
              ].map((step, i) => (
                <div key={step.title} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white font-bold text-lg flex items-center justify-center shadow-md ring-4 ring-white">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-[220px]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What counts as an introduction */}
      <section className="py-20 bg-gray-50">
        <div className="container max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            What counts as an introduction
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            A warm introduction means emailing me with the prospect CC&rsquo;d, and a short note on why Ferdy might be
            a fit for them.
          </p>

          {/* Counts - lead card with example email */}
          <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-green-50 border-b border-green-100">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">This counts</h3>
            </div>
            <div className="p-6 md:p-8">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 font-mono text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
                <span className="text-gray-500">To:</span> andrew@ferdy.io
                <br />
                <span className="text-gray-500">Cc:</span> sarah@cafeco.nz
                <br />
                <span className="text-gray-500">Subject:</span> Intro: Sarah @ CaféCo &lt;&gt; Andrew @ Ferdy
                <br />
                <br />
                Hi Andrew, meet Sarah - she runs CaféCo, three cafes in Auckland, and
                is drowning in social media admin. I reckon Ferdy would be a great fit.
                <br />
                <br />
                Sarah, Andrew built Ferdy to automate the kinds of posts you already
                repeat every month. I&rsquo;ll let him take it from here.
              </div>
              <p className="mt-5 text-sm text-gray-600 leading-relaxed">
                Short, warm, the prospect is CC&rsquo;d, and there&rsquo;s a reason they&rsquo;d care. That&rsquo;s all
                it takes.
              </p>
            </div>
          </div>

          {/* Doesn't count - de-emphasised */}
          <div className="mt-6 flex gap-3 items-start bg-white/60 rounded-xl border border-gray-200 p-5">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <X className="w-5 h-5 text-gray-600" strokeWidth={3} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-1">What doesn&rsquo;t count</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Suggesting a company name for me to cold-approach. Warm intros convert; cold leads don&rsquo;t -
                so the commission is tied to the intro you make yourself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How much you earn */}
      <section className="py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-3">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                How much you earn
              </h2>
              <ul className="space-y-3">
                {[
                  <><strong>20% of the customer&rsquo;s monthly subscription</strong>, for the lifetime of the customer</>,
                  <>Ferdy is NZD $147 per brand per month - that&rsquo;s <strong>roughly $29.40 per brand, per month</strong> to you</>,
                  <>If the customer adds more brands, your commission scales automatically</>,
                  <><strong>Discount codes.</strong> I may give you a code to offer prospects as an incentive. If a discount applies - either one I&rsquo;ve given you to share, or one I&rsquo;ve offered the customer directly - your commission is 20% of the discounted amount they actually pay</>,
                  <>Commission is exclusive of GST (see <em>How you get paid</em> below)</>,
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-gray-700 leading-relaxed">
                    <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] p-8 text-white shadow-xl text-center">
                <div className="text-sm font-medium opacity-90 mb-2">You earn roughly</div>
                <div className="text-5xl md:text-6xl font-bold mb-1">$29.40</div>
                <div className="text-base opacity-90">per brand, per month</div>
                <div className="text-xs opacity-75 mt-3">(20% of NZD $147)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How you get paid */}
      <section className="py-20 bg-gray-50">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-3">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How you get paid
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                I handle everything - no invoicing admin on your end.
              </p>
              <ul className="space-y-3">
                {[
                  <>At the start of each month, I&rsquo;ll issue you a <strong>Buyer-Created Tax Invoice (BCTI)</strong> for the previous month&rsquo;s commissions</>,
                  <>Payment lands in your bank account within 7 days (NZ bank transfer, or Wise for international partners)</>,
                  <><strong>Minimum payout: NZD $50.</strong> Anything under rolls into the next month</>,
                  <><strong>GST:</strong> If you&rsquo;re GST-registered, I&rsquo;ll add 15% GST on top of your commission. If you&rsquo;re not, no GST applies. Either way, your 20% is the same</>,
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-gray-700 leading-relaxed">
                    <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* BCTI preview card */}
            <div className="lg:col-span-2">
              <BctiPreviewCard />
            </div>
          </div>
        </div>
      </section>

      {/* Good to know - card grid */}
      <section className="py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Good to know
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: InfinityIcon,
                title: 'Lifetime commission',
                body: 'As long as the customer pays, you get paid.',
              },
              {
                icon: Settings2,
                title: 'Plan changes',
                body: 'If they add or remove brands, your commission adjusts automatically.',
              },
              {
                icon: Rotate3d,
                title: 'Cancellations',
                body: 'If a customer cancels and later returns, your commission resumes.',
              },
              {
                icon: ArrowDown,
                title: 'Refunds',
                body: 'Deducted from your next payout.',
              },
              {
                icon: Clock,
                title: '60-day window',
                body: 'If a company you\u2019ve introduced doesn\u2019t sign up within 60 days, another partner can claim them with a fresh intro.',
              },
              {
                icon: Calendar,
                title: 'Monthly, reliable',
                body: 'One BCTI per month, one bank transfer, no admin on your end.',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-indigo-600" strokeWidth={2} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Registration form */}
      <section
        id="register"
        className="py-20 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 scroll-mt-16"
      >
        <div className="container max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to start?
            </h2>
            <p className="text-lg text-gray-600">
              Fill in the form below to register. Once you&rsquo;re in, just email me at{' '}
              <a href="mailto:andrew@ferdy.io" className="text-indigo-600 hover:text-indigo-700 font-medium">
                andrew@ferdy.io
              </a>{' '}
              whenever you have an introduction to make.
            </p>
          </div>
          <PartnerRegistrationForm />
        </div>
      </section>

      {/* Personal sign-off */}
      <section className="py-20 bg-white">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-8 md:p-10">
            <div className="flex items-start gap-5">
              <img
                src={PORTRAIT_SRC}
                alt="Andrew Ferdinando"
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shadow-md ring-2 ring-white flex-shrink-0"
              />
              <div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Thanks for considering the Partner Programme. Ferdy is a small team (mostly just me!), and
                  warm intros from people my customers trust is how we grow. If you want to chat anything
                  through before signing up, I&rsquo;d love to hear from you.
                </p>
                <div className="flex items-center gap-2 text-gray-900">
                  <a
                    href="mailto:andrew@ferdy.io"
                    className="inline-flex items-center gap-2 font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Mail className="w-4 h-4" />
                    andrew@ferdy.io
                  </a>
                </div>
                <p className="mt-4 text-sm text-gray-500">- Andrew, Founder of Ferdy</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * Miniature BCTI preview card - visual mock of what a partner receives each
 * month. Purely decorative; numbers are illustrative.
 */
function BctiPreviewCard() {
  return (
    <div className="relative">
      {/* soft glow behind */}
      <div className="absolute -inset-4 bg-gradient-to-br from-[#6366F1]/15 to-[#4F46E5]/10 rounded-3xl blur-2xl" />

      <div
        className="relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden transform lg:rotate-[1.5deg] hover:rotate-0 transition-transform duration-300"
        aria-label="Example BCTI preview"
      >
        {/* top bar */}
        <div className="px-5 py-3 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white">
          <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
            Buyer-created tax invoice
          </div>
          <div className="text-base font-bold">BCTI-0042</div>
        </div>

        {/* meta row */}
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between text-[11px]">
          <div>
            <div className="text-gray-400 uppercase tracking-wider text-[10px]">Issued</div>
            <div className="text-gray-700 font-medium">1 May 2026</div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 uppercase tracking-wider text-[10px]">Period</div>
            <div className="text-gray-700 font-medium">Apr 2026</div>
          </div>
        </div>

        {/* parties */}
        <div className="px-5 py-3 border-b border-gray-100 grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <div className="text-gray-400 uppercase tracking-wider text-[10px]">From</div>
            <div className="text-gray-700 font-medium">Ferdy AI Limited</div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 uppercase tracking-wider text-[10px]">To</div>
            <div className="text-gray-700 font-medium">Your business</div>
          </div>
        </div>

        {/* line items */}
        <div className="px-5 pt-3">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Commissions
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'CaféCo · 3 brands', amount: '$88.20' },
              { label: 'North Fit Studio · 1 brand', amount: '$29.40' },
              { label: 'Lumen Architects · 2 brands', amount: '$58.80' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-[11px]">
                <span className="text-gray-600 truncate pr-2">{row.label}</span>
                <span className="text-gray-900 font-medium tabular-nums">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* totals */}
        <div className="px-5 pt-3 pb-5 mt-3 border-t border-gray-100">
          <div className="flex justify-between text-[11px] text-gray-600">
            <span>Subtotal</span>
            <span className="tabular-nums">$176.40</span>
          </div>
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>GST (15%)</span>
            <span className="tabular-nums">$26.46</span>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
            <span className="text-sm font-bold text-gray-900">Total due</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">NZD $202.86</span>
          </div>
          <div className="mt-3 text-[10px] text-gray-400 text-center">
            Paid within 7 days · Direct to your bank
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">Example only. Your real BCTI is issued as a PDF.</p>
    </div>
  )
}
