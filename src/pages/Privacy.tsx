import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back Link */}
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-primary font-medium hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign up
        </Link>

        {/* Header */}
        <div className="mb-8">
          <img src="/SoloLogo.jpg" alt="SoloWipe" className="h-10 mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Account information (email address, business name)</li>
              <li>Customer data you input (names, addresses, phone numbers (mobile_phone), contact details)</li>
              <li>Job history including scheduled dates, completion dates, payment status, and payment methods</li>
              <li>Payment records including GoCardless mandate data, payment status, and transaction details</li>
              <li>SMS message content (for service receipts, reminders, and customer communications)</li>
              <li>Photos uploaded as proof of work</li>
              <li>Location data (when using route optimization features)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Develop new features and services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2.5. Lawful Basis for Processing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under UK GDPR, we process your personal data under the following lawful bases:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li><strong>Contract:</strong> To provide and maintain the SoloWipe service, process payments, and fulfill our obligations to you</li>
              <li><strong>Legitimate Interest:</strong> To improve our services, prevent fraud, and ensure service security</li>
              <li><strong>Legal Obligation:</strong> To maintain accounting and tax records as required by UK law</li>
              <li><strong>Consent:</strong> For marketing communications (where you have opted in)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You have the right to object to processing based on legitimate interest. For more information about your rights, see section 5 below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption and security practices. 
              We use secure cloud infrastructure to protect your information from unauthorized access, 
              alteration, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share 
              information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist in operating our service</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Third-Party Data Processors:</strong> We use the following service providers to operate our service. 
              We have data processing agreements in place with all processors to ensure GDPR compliance:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li><strong>Supabase</strong> - Database, authentication, and file storage services</li>
              <li><strong>GoCardless</strong> - Direct Debit payment processing</li>
              <li><strong>Stripe</strong> - Subscription payment processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Access and receive a copy of your data</li>
              <li>Correct inaccurate personal information</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We retain your personal information according to the following retention periods:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li><strong>Active Account Data:</strong> Retained while your account is active and for 30 days after account deletion request</li>
              <li><strong>Accounting Records:</strong> Retained for 6 years as required by UK law (Companies Act 2006, HMRC requirements)</li>
              <li><strong>Payment Records:</strong> Retained for 6 years for tax and accounting purposes</li>
              <li><strong>Customer Data:</strong> Retained while your account is active. You may request deletion of customer data at any time through the app settings</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You may request deletion of your account and associated data at any time through the app settings. 
              Note that we may retain certain information for longer periods where required by law (e.g., accounting records).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and preferences. We do not use 
              third-party tracking cookies for advertising purposes. For detailed information about 
              the cookies we use, please see our{' '}
              <a href="/cookies" className="text-primary hover:underline">
                Cookie Policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Data Breach Notification</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              In the event of a personal data breach that is likely to result in a high risk to your rights and freedoms, 
              we will notify you without undue delay. We will also notify the Information Commissioner&apos;s Office (ICO) 
              within 72 hours of becoming aware of the breach, as required by UK GDPR.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our breach notification will include:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>The nature of the breach</li>
              <li>The categories and approximate number of individuals affected</li>
              <li>The likely consequences of the breach</li>
              <li>The measures we are taking or have taken to address the breach</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not intended for children under 16 years of age. We do not knowingly 
              collect personal information from children under 16.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes 
              by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us & ICO Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you have any questions about this Privacy Policy or our data practices, please 
              contact us through the app settings or email us at{' '}
              <a href="mailto:aaron@solowipe.co.uk" className="text-primary hover:underline">
                aaron@solowipe.co.uk
              </a>.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Information Commissioner&apos;s Office (ICO):</strong> If you have concerns about how we handle 
              your personal data, you have the right to lodge a complaint with the ICO. You can find more information 
              at{' '}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                ico.org.uk
              </a>.
              {/* TODO: Add ICO registration number here once registered: "We are registered with the ICO under registration number [Z1234567]" */}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
