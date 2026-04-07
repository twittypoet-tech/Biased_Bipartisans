import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Biased Bipartisans',
  description: 'How Biased Bipartisans collects, uses, stores, and protects your personal information.',
}

const LAST_UPDATED = 'April 6, 2026'

export default function PrivacyPage() {
  return (
    <div className="bg-t-bg">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 mb-4">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-t-text mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Privacy Policy
        </h1>
        <p className="text-sm text-t-text-3 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8">

          <Section title="1. Information We Collect">
            <h3>Information you provide:</h3>
            <ul>
              <li><strong>Account information:</strong> Email address, display name (optional), and avatar (optional) when you create an account.</li>
              <li><strong>Interest data:</strong> Topics and interests you share during onboarding calls with the Bipi agent.</li>
              <li><strong>Report queries:</strong> The topics and questions you submit to The Reporter agent.</li>
              <li><strong>Votes and interactions:</strong> Your upvotes, downvotes, and commentary requests.</li>
              <li><strong>Contact submissions:</strong> Name, email, reason, and message when you use our contact form.</li>
              <li><strong>Journalist applications:</strong> Name, email, portfolio URL, expertise areas, and statement.</li>
              <li><strong>Payment information:</strong> Processed by Stripe. We store your Stripe customer ID and subscription ID but never your card numbers, bank details, or payment credentials.</li>
            </ul>

            <h3>Information collected automatically:</h3>
            <ul>
              <li><strong>Usage analytics:</strong> Page views, feature usage, and session data via Vercel Analytics.</li>
              <li><strong>Device information:</strong> Browser type, operating system, and language preferences.</li>
              <li><strong>Authentication cookies:</strong> Session tokens managed by Supabase Auth for maintaining your login state.</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li><strong>Service delivery:</strong> To generate reports, process commentary requests, manage your credit balance, and deliver personalized preset suggestions.</li>
              <li><strong>Personalization:</strong> To tailor report suggestions based on your stated interests.</li>
              <li><strong>Communication:</strong> To send authentication codes, credit refund notifications, and respond to contact form submissions.</li>
              <li><strong>Platform improvement:</strong> To analyze usage patterns, fix bugs, and improve features.</li>
              <li><strong>Billing:</strong> To process payments, manage subscriptions, and maintain transaction records.</li>
              <li><strong>Security:</strong> To prevent abuse, enforce rate limits, and protect the Platform.</li>
            </ul>
            <p>We do not sell your personal information to third parties. We do not use your data for advertising targeting beyond our own Platform&apos;s sponsored content.</p>
          </Section>

          <Section title="3. Data Storage and Retention">
            <p>Your data is stored in Supabase (PostgreSQL) hosted infrastructure. Authentication is managed through Supabase Auth.</p>
            <ul>
              <li><strong>Account data:</strong> Retained while your account is active. Deleted upon account deletion request.</li>
              <li><strong>Reports and commentary:</strong> Retained while published. Deleted reports are permanently removed from the database.</li>
              <li><strong>Credit transactions:</strong> Retained for billing and audit purposes for the duration of your account.</li>
              <li><strong>Contact messages:</strong> Retained for 24 months unless a longer retention is required for an ongoing matter.</li>
              <li><strong>Analytics data:</strong> Aggregated and anonymized. Individual session data retained per Vercel Analytics retention policy.</li>
            </ul>
          </Section>

          <Section title="4. Third-Party Data Sharing">
            <p>We share data with third-party service providers only as necessary to operate the Platform:</p>
            <ul>
              <li><strong>Supabase:</strong> Database hosting and authentication. Stores your profile, reports, and interactions.</li>
              <li><strong>Stripe:</strong> Payment processing. Receives your email and payment method for billing.</li>
              <li><strong>Retell AI:</strong> Voice call processing. Receives your voice audio during reporter calls and onboarding.</li>
              <li><strong>Bright Data:</strong> Web search during report generation. Receives search queries (not your personal information).</li>
              <li><strong>OpenAI:</strong> Report structuring and preset generation. Receives report transcripts and your interest list (not your identity).</li>
              <li><strong>Brevo:</strong> Transactional email delivery. Receives your email address for authentication codes and contact form notifications.</li>
              <li><strong>Vercel:</strong> Hosting and analytics. Receives standard web request data.</li>
              <li><strong>Google AdSense:</strong> Advertising on report pages. May use cookies for ad personalization per Google&apos;s privacy policy.</li>
            </ul>
            <p>Each provider operates under their own privacy policy and data processing agreements.</p>
          </Section>

          <Section title="5. Cookies and Tracking">
            <p>We use the following cookies:</p>
            <ul>
              <li><strong>Authentication cookies:</strong> Essential. Managed by Supabase Auth to maintain your session. Cannot be disabled without losing login functionality.</li>
              <li><strong>Analytics:</strong> Vercel Web Analytics for aggregate usage statistics. No personally identifiable information is collected.</li>
              <li><strong>Google AdSense:</strong> Third-party cookies on report pages for ad serving and personalization. You can manage ad personalization through Google&apos;s Ad Settings.</li>
            </ul>
            <p>We do not use tracking pixels, fingerprinting, or cross-site tracking technologies beyond those listed above.</p>
          </Section>

          <Section title="6. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access your data:</strong> View your profile, reports, and transaction history through your Dashboard.</li>
              <li><strong>Correct your data:</strong> Update your display name and interests through Settings.</li>
              <li><strong>Delete your data:</strong> Delete individual reports from your Dashboard. Request full account deletion by contacting us.</li>
              <li><strong>Export your data:</strong> Request a copy of your data by contacting us at contact@biasedbipartisans.com.</li>
              <li><strong>Opt out of marketing:</strong> We do not send marketing emails. All emails are transactional (authentication codes, contact form responses).</li>
            </ul>
            <p>California residents (CCPA), EU residents (GDPR), and UK residents have additional rights under their respective privacy laws. Contact us to exercise these rights.</p>
          </Section>

          <Section title="7. Data Security">
            <p>We implement security measures including:</p>
            <ul>
              <li>Encrypted data transmission (HTTPS/TLS) for all Platform communications.</li>
              <li>Secure authentication via Supabase Auth with email OTP (no passwords stored).</li>
              <li>Row-level security (RLS) policies on all database tables ensuring users can only access their own data.</li>
              <li>Stripe PCI-DSS compliant payment processing (card data never touches our servers).</li>
              <li>Environment variable isolation for API keys and secrets.</li>
            </ul>
            <p>No system is 100% secure. If you discover a security vulnerability, report it to contact@biasedbipartisans.com.</p>
          </Section>

          <Section title="8. Children&apos;s Privacy">
            <p>The Platform is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, contact us and we will delete it.</p>
          </Section>

          <Section title="9. International Data Transfers">
            <p>Your data may be processed in the United States and other countries where our service providers operate. By using the Platform, you consent to this transfer. We ensure appropriate safeguards are in place with our service providers.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy periodically. Material changes will be communicated via email or Platform notification. The &quot;Last updated&quot; date at the top reflects the most recent revision.</p>
          </Section>

          <Section title="11. Contact">
            <p>For privacy-related questions or requests, contact us at <a href="mailto:contact@biasedbipartisans.com" className="text-t-accent-text hover:underline">contact@biasedbipartisans.com</a> or through our <a href="/contact" className="text-t-accent-text hover:underline">contact form</a>.</p>
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
      <div className="space-y-3 text-sm text-t-text-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-sm [&_li]:leading-relaxed [&_strong]:text-t-text [&_strong]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-t-text [&_h3]:mt-3 [&_h3]:mb-1">
        {children}
      </div>
    </section>
  )
}
