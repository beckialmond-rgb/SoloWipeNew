import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-primary font-medium hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <img src="/SoloLogo.jpg" alt="SoloWipe" className="h-10 mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground">Last updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are placed on your device when you visit a website. 
              They are widely used to make websites work more efficiently and to provide information 
              to the website owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              SoloWipe uses cookies to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Keep you signed in to your account</li>
              <li>Remember your preferences and settings</li>
              <li>Ensure the security of your account</li>
              <li>Improve the performance and functionality of our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Types of Cookies We Use</h2>
            
            <div className="mt-4 space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">3.1 Essential Cookies</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  These cookies are necessary for the website to function and cannot be switched off. 
                  They are usually only set in response to actions made by you, such as logging in.
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1 text-sm">
                  <li><strong>Authentication Session Cookie:</strong> Maintains your login session (provided by Supabase)</li>
                  <li><strong>Duration:</strong> Session-based (expires when you close your browser) or persistent (up to 1 year)</li>
                  <li><strong>Purpose:</strong> Security and authentication</li>
                </ul>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">3.2 Third-Party Service Cookies</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  We use third-party services that may set cookies on your device:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1 text-sm">
                  <li><strong>GoCardless:</strong> Used during Direct Debit setup and payment processing (OAuth flow)</li>
                  <li><strong>Stripe:</strong> Used during subscription checkout and payment processing</li>
                  <li><strong>Duration:</strong> Session-based or as specified by the third-party service</li>
                  <li><strong>Purpose:</strong> Payment processing and account linking</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Cookie Duration</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Cookies we use fall into two categories:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li><strong>Session Cookies:</strong> Temporary cookies that expire when you close your browser</li>
              <li><strong>Persistent Cookies:</strong> Cookies that remain on your device for a set period (up to 1 year) or until you delete them</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You can control and manage cookies in various ways. Please note that removing or blocking 
              cookies may impact your user experience and some parts of our service may not function properly.
            </p>
            
            <div className="mt-4 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Browser Settings</h3>
                <p className="text-muted-foreground leading-relaxed text-sm mb-2">
                  Most browsers allow you to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                  <li>See what cookies you have and delete them individually</li>
                  <li>Block third-party cookies</li>
                  <li>Block cookies from specific sites</li>
                  <li>Block all cookies</li>
                  <li>Delete all cookies when you close your browser</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Browser-Specific Instructions</h3>
                <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                  <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                  <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                  <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                  <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. What Happens If You Disable Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you choose to disable cookies, some features of SoloWipe may not function properly. 
              Specifically, you may not be able to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Stay logged in to your account</li>
              <li>Complete payment transactions (GoCardless, Stripe)</li>
              <li>Save your preferences and settings</li>
              <li>Use certain features that require authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you use certain features of SoloWipe, third-party services may set cookies on your device:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li><strong>GoCardless:</strong> Used for Direct Debit payment processing. See{' '}
                <a href="https://gocardless.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  GoCardless Privacy Policy
                </a>
              </li>
              <li><strong>Stripe:</strong> Used for subscription payments. See{' '}
                <a href="https://stripe.com/gb/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Stripe Privacy Policy
                </a>
              </li>
              <li><strong>Supabase:</strong> Provides our authentication and database services. See{' '}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Supabase Privacy Policy
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not control these third-party cookies. Please refer to the respective privacy policies 
              of these services for information about their cookie practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Changes to This Cookie Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or 
              for other operational, legal, or regulatory reasons. We will notify you of any changes by 
              posting the new Cookie Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Cookie Policy or our use of cookies, please contact us 
              through the app settings or email us at{' '}
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

export default CookiePolicy;

