import type { Metadata } from 'next'
import {
  UserPlus,
  Mail,
  Handshake,
  DollarSign,
  Check,
  X,
  ArrowDown,
} from 'lucide-react'
import PartnerRegistrationForm from './PartnerRegistrationForm'

export const metadata: Metadata = {
  title: 'Partner Programme',
  description: 'Earn 20% lifetime commission on every Ferdy customer you introduce.',
  robots: { index: false, follow: false },
}

export default function PartnersPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative pt-24 pb-20 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-4">
            Ferdy Partner Programme
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-[1.1]">
            Earn <span className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] bg-clip-text text-transparent">20% lifetime commission</span> on every Ferdy customer you introduce.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            If you know businesses or agencies anywhere in the world who could benefit from Ferdy, I&rsquo;d love you to
            introduce us. When your introduction turns into a customer, you earn 20% of their subscription &mdash;
            every month, for as long as they stay with Ferdy.
          </p>
          <a
            href="#register"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Become a partner
            <ArrowDown className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: UserPlus,
                title: 'Register as a partner',
                body: 'Fill in the form below and you\u2019re in.',
              },
              {
                icon: Mail,
                title: 'Make an introduction',
                body: 'Email me at andrew@ferdy.io with a proper intro, CC\u2019ing the prospect.',
              },
              {
                icon: Handshake,
                title: 'I take it from there',
                body: 'I\u2019ll reach out, run the demo, and handle the onboarding.',
              },
              {
                icon: DollarSign,
                title: 'You get paid every month',
                body: 'For as long as the customer pays their subscription.',
              },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={step.title}
                  className="relative bg-white rounded-2xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-bold flex items-center justify-center shadow-sm">
                    {i + 1}
                  </div>
                  <Icon className="w-8 h-8 text-indigo-600 mb-4 mt-2" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* What counts as an introduction */}
      <section className="py-20 bg-gray-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            What counts as an introduction
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            A warm introduction means emailing me with the prospect CC&rsquo;d, including a short note about who they
            are and why Ferdy might be a fit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-green-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" strokeWidth={3} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Counts</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                A warm email introducing me to the prospect, with them CC&rsquo;d and a short note on who they are and
                why Ferdy might be a fit.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-5 h-5 text-gray-500" strokeWidth={3} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Doesn&rsquo;t count</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Suggesting a company name for me to cold-approach. Warm intros convert; cold leads don&rsquo;t &mdash;
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
                  <>Ferdy is NZD $147 per brand per month &mdash; that&rsquo;s <strong>roughly $29.40 per brand, per month</strong> to you</>,
                  <>If the customer adds more brands, your commission scales automatically</>,
                  <><strong>Discount codes.</strong> I may give you a code to offer prospects as an incentive. If a discount applies &mdash; either one I&rsquo;ve given you to share, or one I&rsquo;ve offered the customer directly &mdash; your commission is 20% of the discounted amount they actually pay</>,
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
        <div className="container max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How you get paid
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            I handle everything &mdash; no invoicing admin on your end.
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
      </section>

      {/* Good to know */}
      <section className="py-20">
        <div className="container max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Good to know
          </h2>
          <ul className="space-y-3">
            {[
              <><strong>Lifetime commission.</strong> As long as the customer pays, you get paid</>,
              <><strong>Plan changes.</strong> If they add or remove brands, your commission adjusts automatically</>,
              <><strong>Cancellations.</strong> If a customer cancels and later returns, your commission resumes</>,
              <><strong>Refunds.</strong> Deducted from your next payout</>,
              <><strong>60-day window.</strong> If a company you&rsquo;ve introduced doesn&rsquo;t sign up within 60 days, another partner can claim them with a fresh intro</>,
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-gray-700 leading-relaxed">
                <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Registration form */}
      <section id="register" className="py-20 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 scroll-mt-16">
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

      {/* Final CTA / contact fallback */}
      <section className="py-16">
        <div className="container max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Questions?
          </h2>
          <p className="text-gray-600 mb-6">
            Flick me an email &mdash; happy to chat through anything.
          </p>
          <a
            href="mailto:andrew@ferdy.io"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-lg"
          >
            <Mail className="w-5 h-5" />
            andrew@ferdy.io
          </a>
        </div>
      </section>
    </div>
  )
}
