import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Partner Programme Terms & Conditions',
  description: 'Ferdy Partner Programme Terms & Conditions.',
  robots: { index: false, follow: false },
}

const LAST_UPDATED = '23 April 2026'

const sectionHeadingClass =
  'text-xl md:text-2xl font-bold text-gray-900 mt-10 mb-3 scroll-mt-20'
const paragraphClass = 'text-gray-700 leading-relaxed mb-4'
const listClass = 'list-disc pl-6 space-y-2 text-gray-700 mb-4'

function BackToPartners() {
  return (
    <Link
      href="/partners"
      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Partner Programme
    </Link>
  )
}

export default function PartnerTermsPage() {
  return (
    <div className="bg-white">
      <div className="py-16 md:py-20">
        <div className="container max-w-[720px] mx-auto px-4">
          <div className="mb-8">
            <BackToPartners />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Partner Programme Terms &amp; Conditions
          </h1>
          <p className="text-sm text-gray-500 mb-10">
            <em>Last updated: {LAST_UPDATED}</em>
          </p>

          <p className={paragraphClass}>
            These terms govern the Ferdy Partner Programme operated by Ferdy AI Limited (NZBN 9429052755095), a New
            Zealand company (&ldquo;Ferdy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By registering as a partner,
            you (&ldquo;Partner&rdquo;, &ldquo;you&rdquo;) agree to these terms.
          </p>

          <h2 className={sectionHeadingClass}>1. About the programme</h2>
          <p className={paragraphClass}>
            The Ferdy Partner Programme rewards you with commission when you introduce new paying customers to Ferdy.
            You remain an independent contractor. Nothing in these terms creates an employment, agency, partnership,
            or joint venture relationship between you and Ferdy.
          </p>

          <h2 className={sectionHeadingClass}>2. Registration and eligibility</h2>
          <p className={paragraphClass}>
            You must register via the form at ferdy.io/partners and provide accurate, current information. You must
            be over 18 and legally able to enter into contracts. New Zealand partners provide bank account details
            for direct NZ bank transfer. Partners outside New Zealand provide a Wise-linked email address and are
            paid via Wise; if you don&rsquo;t have a Wise account, Ferdy will contact you to arrange an alternative
            payment method. You must keep your contact, business, and payment details up to date by emailing{' '}
            <a href="mailto:andrew@ferdy.io" className="text-indigo-600 hover:underline font-medium">
              andrew@ferdy.io
            </a>
            . Ferdy may refuse or terminate any registration at its discretion.
          </p>

          <h2 className={sectionHeadingClass}>3. What counts as a qualifying introduction</h2>
          <p className={paragraphClass}>
            A qualifying introduction is a warm email introduction sent to{' '}
            <a href="mailto:andrew@ferdy.io" className="text-indigo-600 hover:underline font-medium">
              andrew@ferdy.io
            </a>{' '}
            with the prospect CC&rsquo;d, including a short note about who they are and why Ferdy might be a fit.
          </p>
          <p className={paragraphClass}>The following do not count as qualifying introductions:</p>
          <ul className={listClass}>
            <li>Suggesting a company name for Ferdy to cold-approach</li>
            <li>Forwarding a prospect&rsquo;s contact details without a warm introduction</li>
            <li>
              Introducing a prospect who has already been introduced by another partner within the last 60 days, or
              who is already in active sales discussions with Ferdy
            </li>
            <li>Introducing yourself, a business you own, or a business you control</li>
          </ul>
          <p className={paragraphClass}>
            Ferdy decides in good faith whether an introduction qualifies, and this decision is final.
          </p>

          <h2 className={sectionHeadingClass}>4. Attribution and the 60-day window</h2>
          <p className={paragraphClass}>
            The first partner to make a qualifying introduction for a given prospect is credited with that prospect.
            If the prospect does not become a paying customer within 60 days of the original introduction, the
            attribution expires. A fresh qualifying introduction from another partner after that point will win
            attribution.
          </p>
          <p className={paragraphClass}>
            Only one partner can be credited for any given customer at any given time.
          </p>

          <h2 className={sectionHeadingClass}>5. Commission</h2>
          <p className={paragraphClass}>
            Ferdy will pay you a commission equal to 20% of the net amount (excluding GST and any discounts) actually
            paid by each customer you have introduced, for each monthly subscription period they remain a paying
            customer.
          </p>
          <p className={paragraphClass}>
            The commission is calculated on what the customer actually pays. If a discount applies - whether via a
            promotion code issued to you to share with prospects, or a discount Ferdy applies directly - your
            commission is 20% of the discounted amount.
          </p>
          <p className={paragraphClass}>
            Commission is payable for the lifetime of the customer&rsquo;s subscription, subject to these terms.
          </p>

          <h2 className={sectionHeadingClass}>6. Adjustments, cancellations, and refunds</h2>
          <ul className={listClass}>
            <li>
              If a customer adds or removes brands, or changes plan, your commission adjusts to 20% of the new
              monthly net amount.
            </li>
            <li>
              If a customer cancels their subscription, commission stops. If they later resubscribe, commission
              resumes at the standard rate.
            </li>
            <li>
              If a customer is refunded or receives a credit, the corresponding commission will be deducted from your
              next payout. If the deduction exceeds your pending commissions, the balance carries forward against
              future commissions.
            </li>
            <li>Chargebacks are treated the same way as refunds.</li>
          </ul>

          <h2 className={sectionHeadingClass}>7. How you get paid (Buyer-Created Tax Invoices)</h2>
          <p className={paragraphClass}>
            You agree that Ferdy will issue a Buyer-Created Tax Invoice (BCTI) to you each month for commissions
            earned in the previous month, and that you will not issue a separate tax invoice for the same supply.
            This arrangement is made under section 24(2) of the Goods and Services Tax Act 1985.
          </p>
          <p className={paragraphClass}>Payment terms:</p>
          <ul className={listClass}>
            <li>BCTIs are issued at the start of each month for the previous month&rsquo;s earnings</li>
            <li>Payment is made within 7 days of the BCTI issue date</li>
            <li>
              For New Zealand partners, payment is made by direct NZ bank transfer to the account you provided at
              registration
            </li>
            <li>
              For partners outside New Zealand, payment is made via Wise to the email address you provided at
              registration. Commissions are invoiced in NZD; Wise converts to your local currency at the prevailing
              exchange rate when you withdraw. Any currency conversion fees charged by Wise are your responsibility.
              If you don&rsquo;t have a Wise account, Ferdy will contact you to arrange an alternative
            </li>
            <li>
              The minimum payout threshold is NZD $50. Amounts below this roll forward until the threshold is met
            </li>
            <li>
              If you are GST-registered in New Zealand, Ferdy will add 15% GST to your commission on the BCTI. If you
              are not GST-registered (including all partners outside New Zealand), no GST applies
            </li>
            <li>You must notify Ferdy promptly if your GST registration status changes</li>
            <li>You must notify Ferdy promptly of any change to your bank account or Wise email</li>
          </ul>

          <h2 className={sectionHeadingClass}>8. Tax</h2>
          <p className={paragraphClass}>
            You are responsible for your own tax affairs, including income tax, GST, and any other taxes payable in
            your jurisdiction on commissions earned. Ferdy does not provide tax advice. You should consult your own
            tax advisor.
          </p>

          <h2 className={sectionHeadingClass}>9. Promotion codes</h2>
          <p className={paragraphClass}>
            Ferdy may provide you with a promotion code to share with prospects. You may share this code only with
            prospects you have made or intend to make a qualifying introduction for. You must not publish the code
            publicly, list it on coupon or voucher sites, or otherwise distribute it indiscriminately. Ferdy may
            revoke or change any promotion code at any time.
          </p>

          <h2 className={sectionHeadingClass}>10. How you may promote Ferdy</h2>
          <p className={paragraphClass}>
            You may describe Ferdy accurately and link to ferdy.io. You must not:
          </p>
          <ul className={listClass}>
            <li>Make false, misleading, or exaggerated claims about Ferdy</li>
            <li>
              Use Ferdy&rsquo;s name, logo, or trademarks in a way that implies endorsement of your own products or
              services
            </li>
            <li>
              Register domain names, social handles, or ad campaigns that use &ldquo;Ferdy&rdquo; or confusingly
              similar terms
            </li>
            <li>Bid on &ldquo;Ferdy&rdquo; or variations as paid search keywords</li>
            <li>Send unsolicited bulk email (spam) referencing Ferdy</li>
            <li>Impersonate Ferdy or any Ferdy employee</li>
          </ul>

          <h2 className={sectionHeadingClass}>11. Confidentiality</h2>
          <p className={paragraphClass}>
            Any non-public information Ferdy shares with you - including customer lists, pricing, product roadmap,
            and commercial terms - is confidential. You must not disclose it to third parties or use it for any
            purpose other than participating in this programme.
          </p>

          <h2 className={sectionHeadingClass}>12. Data and privacy</h2>
          <p className={paragraphClass}>
            You must handle any personal information you collect from prospects (including in the course of making
            introductions) in accordance with applicable privacy laws. Ferdy will handle your personal information
            and any prospect information in accordance with its privacy practices. Ferdy will not share your bank or
            payment details with any third party except as required to process payment.
          </p>

          <h2 className={sectionHeadingClass}>13. Termination</h2>
          <p className={paragraphClass}>
            Either party may terminate participation in the programme at any time, for any reason, by written notice
            (email is sufficient).
          </p>
          <p className={paragraphClass}>On termination:</p>
          <ul className={listClass}>
            <li>
              Commissions already accrued and owing will be paid in the next regular payout cycle, subject to the
              minimum threshold
            </li>
            <li>No further commissions will accrue for introductions made after the termination date</li>
            <li>
              For customers introduced before termination, commissions will continue to accrue for the lifetime of
              each customer&rsquo;s subscription, subject to the adjustments, cancellation, and refund rules in
              clause 6. This does not apply if Ferdy terminates for cause under clause 14, in which case all unpaid
              commissions are forfeited.
            </li>
          </ul>

          <h2 className={sectionHeadingClass}>14. Termination for cause</h2>
          <p className={paragraphClass}>
            Ferdy may terminate your participation immediately and forfeit any unpaid commission if you:
          </p>
          <ul className={listClass}>
            <li>Breach these terms in a material way</li>
            <li>Provide false or misleading information during registration or in making introductions</li>
            <li>Engage in fraudulent, deceptive, or illegal conduct</li>
            <li>Damage Ferdy&rsquo;s reputation or relationships with customers or prospects</li>
            <li>Fail to respond to reasonable Ferdy enquiries within 30 days</li>
          </ul>

          <h2 className={sectionHeadingClass}>15. Changes to these terms</h2>
          <p className={paragraphClass}>
            Ferdy may update these terms from time to time. Material changes will be notified to you by email at
            least 14 days before they take effect. Your continued participation after the effective date constitutes
            acceptance. If you do not accept the changes, you may terminate under clause 13.
          </p>

          <h2 className={sectionHeadingClass}>16. Changes to commission rates</h2>
          <p className={paragraphClass}>
            Ferdy may change the commission rate or structure from time to time on 30 days&rsquo; written notice. Any
            change applies only to commissions accrued on or after the effective date. Commissions already accrued at
            the prior rate are not affected.
          </p>

          <h2 className={sectionHeadingClass}>17. Liability</h2>
          <p className={paragraphClass}>To the fullest extent permitted by law:</p>
          <ul className={listClass}>
            <li>
              Ferdy&rsquo;s total liability to you under these terms is limited to the total commissions paid or
              payable to you in the 12 months preceding the event giving rise to the claim
            </li>
            <li>
              Neither party is liable for indirect, consequential, or special losses, including loss of profit,
              revenue, or opportunity
            </li>
            <li>Nothing in these terms limits liability that cannot be limited by law</li>
          </ul>

          <h2 className={sectionHeadingClass}>18. General</h2>
          <p className={paragraphClass}>
            These terms are governed by the laws of New Zealand. The courts of New Zealand have exclusive
            jurisdiction over any dispute. If any provision is held unenforceable, the remaining provisions continue
            in effect. These terms are the entire agreement between you and Ferdy regarding the Partner Programme and
            supersede any prior discussions or representations.
          </p>

          <h2 className={sectionHeadingClass}>19. Contact</h2>
          <p className={paragraphClass}>
            For any questions about these terms or the programme, email{' '}
            <a href="mailto:andrew@ferdy.io" className="text-indigo-600 hover:underline font-medium">
              andrew@ferdy.io
            </a>
            .
          </p>

          <div className="mt-16 pt-8 border-t border-gray-200">
            <BackToPartners />
          </div>
        </div>
      </div>
    </div>
  )
}
