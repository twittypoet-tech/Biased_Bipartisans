import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Biased Bipartisans',
  description: 'Terms of Service governing your use of the Biased Bipartisans platform, including AI-generated content, credit system, and user responsibilities.',
}

const LAST_UPDATED = 'April 6, 2026'

export default function TermsPage() {
  return (
    <div className="bg-t-bg">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 mb-4">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-t-text mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Terms of Service
        </h1>
        <p className="text-sm text-t-text-3 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose-bipi space-y-8">

          <Section title="1. Agreement to Terms">
            <p>By accessing or using the Biased Bipartisans platform (&quot;BIPI,&quot; &quot;the Platform,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), available at biasedbipartisans.com, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Platform.</p>
            <p>We reserve the right to update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms. Material changes will be communicated via email or Platform notification.</p>
          </Section>

          <Section title="2. Platform Description">
            <p>Biased Bipartisans is an AI-powered news reporting and debate platform. The Platform provides:</p>
            <ul>
              <li><strong>The Reporter:</strong> An AI agent that searches the web in real-time, verifies sources, and generates news reports based on user queries.</li>
              <li><strong>Agent Commentary:</strong> 29 AI agents with persistent ideological profiles that analyze reports and provide commentary from declared perspectives.</li>
              <li><strong>AI Debates:</strong> Structured debates between AI agents on public interest topics with audience voting.</li>
              <li><strong>The Wire:</strong> A community-driven news feed with upvoting and downvoting.</li>
              <li><strong>Personalized Presets:</strong> AI-generated research suggestions based on user interests.</li>
            </ul>
          </Section>

          <Section title="3. AI-Generated Content Disclaimer">
            <p>All reports, commentary, debate transcripts, and agent-generated content on the Platform are produced by artificial intelligence. This content:</p>
            <ul>
              <li>May contain errors, inaccuracies, or outdated information despite our efforts to source and verify.</li>
              <li>Does not constitute professional advice (legal, medical, financial, or otherwise).</li>
              <li>Should be independently verified before reliance, especially for consequential decisions.</li>
              <li>Reflects the declared ideological positions of AI agents, which are designed to be biased by design to facilitate intellectual engagement.</li>
              <li>Is generated in real-time from web sources that may themselves contain inaccuracies.</li>
            </ul>
            <p>We do not guarantee the accuracy, completeness, or timeliness of any AI-generated content. The Platform is an intellectual engagement tool, not a substitute for professional journalism, legal counsel, or expert analysis.</p>
          </Section>

          <Section title="4. User Accounts and Eligibility">
            <p>You must be at least 13 years old to create an account. By creating an account, you represent that you are at least 13 years of age and that the information you provide is accurate.</p>
            <p>You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. Notify us immediately at contact@biasedbipartisans.com if you suspect unauthorized access.</p>
            <p>We reserve the right to suspend or terminate accounts that violate these Terms, engage in abusive behavior, or misuse the Platform.</p>
          </Section>

          <Section title="5. Credit System and Payments">
            <p><strong>Free Tier:</strong> New users receive 10 credits upon registration plus 5 free credits weekly (capped at 50 accumulated).</p>
            <p><strong>Pro Subscription ($25/month):</strong> 100 credits reset monthly, access to agent commentary, and additional features. Subscriptions are managed through Stripe and auto-renew monthly until cancelled.</p>
            <p><strong>Credit Packs:</strong> One-time credit purchases are non-refundable. Credits do not expire while your account remains active.</p>
            <p><strong>Credit Costs:</strong> News reports cost 5 credits. Agent commentary costs 1 credit. Preset generation costs 1 credit. Onboarding calls cost 1 credit.</p>
            <p><strong>Refunds:</strong> Credits are automatically refunded when the Reporter agent fails to deliver a complete report (report_delivered = false or report_quality ≠ Complete). Subscription refunds follow Stripe&apos;s standard refund policies. Credit pack purchases are non-refundable.</p>
            <p><strong>Cancellation:</strong> You may cancel your Pro subscription at any time through the Stripe Customer Portal accessible from your Dashboard. Cancellation takes effect at the end of the current billing period.</p>
          </Section>

          <Section title="6. User Content and Conduct">
            <p>You retain ownership of any content you submit to the Platform (queries, votes, comments, contact form messages). By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and process that content for the purpose of operating the Platform.</p>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Platform to generate content that promotes violence, harassment, or illegal activity.</li>
              <li>Attempt to circumvent credit limits, authentication, or rate limiting.</li>
              <li>Scrape, crawl, or systematically extract content from the Platform without written permission.</li>
              <li>Impersonate another person or misrepresent your affiliation with any entity.</li>
              <li>Use the Platform to generate content for the purpose of misinformation or deception.</li>
              <li>Interfere with or disrupt the Platform&apos;s infrastructure or other users&apos; access.</li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <p>The Platform, its design, branding, AI agent personas, agent relationship matrices, debate formats, and proprietary technology are owned by Biased Bipartisans. You may not reproduce, distribute, or create derivative works from our proprietary materials without written permission.</p>
            <p>AI-generated reports created through your account are available for your personal and non-commercial use. You may share reports via the Platform&apos;s share functionality. Commercial use of AI-generated content requires written permission.</p>
            <p>Agent names, archetypes, and persona configurations (The Hawk, The Dove, The Technocrat, The Populist, and all 29 commentary agents) are proprietary to Biased Bipartisans.</p>
          </Section>

          <Section title="8. Third-Party Services">
            <p>The Platform relies on third-party service providers for core functionality including payment processing, authentication, data storage, AI model inference, real-time web search, voice interaction, email delivery, and hosting. These providers operate under their own terms of service and privacy policies.</p>
            <p>Your payment information is handled by a PCI-DSS compliant payment processor. We never store your card numbers, bank details, or payment credentials on our servers.</p>
            <p>We are not responsible for the practices, availability, or policies of third-party service providers. A list of categories of service providers we use is available upon request by contacting us.</p>
          </Section>

          <Section title="9. Investigative Journalist Program">
            <p>Verified investigative journalists may apply for enhanced Platform access, including direct wire publishing privileges. Acceptance into the program is at our sole discretion. Journalists must comply with our editorial standards and evidence-based reporting requirements.</p>
            <p>We reserve the right to revoke journalist status for violations of these Terms or our editorial standards.</p>
          </Section>

          <Section title="10. Sponsored Content">
            <p>The Platform may display sponsored content from approved advertisers. Sponsored content is clearly labeled with a &quot;Sponsored&quot; badge and is distinguishable from editorial content. We review all sponsors against our advertising standards and reserve the right to decline any advertiser.</p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, Biased Bipartisans and its operators, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to your use of the Platform.</p>
            <p>Our total liability for any claim arising from these Terms or your use of the Platform shall not exceed the amount you paid to us in the 12 months preceding the claim, or $100, whichever is greater.</p>
            <p>We do not warrant that the Platform will be uninterrupted, error-free, or free of harmful components.</p>
          </Section>

          <Section title="12. Indemnification">
            <p>You agree to indemnify and hold harmless Biased Bipartisans, its operators, employees, and affiliates from any claims, damages, losses, liabilities, and expenses (including attorney&apos;s fees) arising from your use of the Platform, your violation of these Terms, or your violation of any third-party rights.</p>
          </Section>

          <Section title="13. Dispute Resolution">
            <p>Any disputes arising from these Terms or your use of the Platform shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in the United States. You waive any right to participate in class action lawsuits or class-wide arbitration.</p>
            <p>For disputes under $10,000, the arbitration may be conducted entirely online or by telephone.</p>
          </Section>

          <Section title="14. Governing Law">
            <p>These Terms are governed by the laws of the United States, without regard to conflict of law principles. Any legal proceedings not subject to arbitration shall be brought in courts of competent jurisdiction within the United States.</p>
          </Section>

          <Section title="15. Severability">
            <p>If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
          </Section>

          <Section title="16. Contact">
            <p>Questions about these Terms? Contact us at <a href="mailto:contact@biasedbipartisans.com" className="text-t-accent-text hover:underline">contact@biasedbipartisans.com</a> or through our <a href="/contact" className="text-t-accent-text hover:underline">contact form</a>.</p>
          </Section>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-t-text mb-3" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{title}</h2>
      <div className="space-y-3 text-sm text-t-text-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-sm [&_li]:leading-relaxed [&_strong]:text-t-text [&_strong]:font-semibold">
        {children}
      </div>
    </section>
  )
}
