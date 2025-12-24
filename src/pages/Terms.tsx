import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Terms = () => {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using SoloWipe, you accept and agree to be bound by the terms and provisions of this agreement. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              SoloWipe is a business management application designed for window cleaning professionals. 
              The service includes customer management, job scheduling, payment tracking, and business analytics features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities 
              that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. User Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all data you input into SoloWipe, including customer information, job records, 
              and business data. We will not share your data with third parties except as required to provide the service 
              or as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to use SoloWipe only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Upload malicious code or content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain high availability of our service but do not guarantee uninterrupted access. 
              We reserve the right to modify, suspend, or discontinue the service at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Nothing in these Terms shall exclude or limit our liability for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1">
              <li>death or personal injury caused by our negligence;</li>
              <li>fraud or fraudulent misrepresentation; or</li>
              <li>any other liability that cannot be excluded or limited by English law.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Subject to the above, SoloWipe shall not be liable for any indirect, incidental, special, consequential, or punitive damages 
              resulting from your use of or inability to use the service. Our total liability shall not exceed the 
              amount paid by you for the service in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of significant changes 
              via email or through the application. Your continued use of the service after changes constitutes 
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of England and Wales. 
              Any disputes arising under or in connection with these Terms shall be subject to the exclusive 
              jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through the app settings 
              or email us at{' '}
              <a href="mailto:aaron@solowipe.co.uk" className="text-primary hover:underline">
                aaron@solowipe.co.uk
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
