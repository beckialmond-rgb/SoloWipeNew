import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  userEmail?: string;
  dashboardUrl?: string;
  businessName?: string;
}

export const WelcomeEmail = ({
  userEmail = 'there',
  dashboardUrl = 'https://solowipe.co.uk/dashboard',
  businessName = 'SoloWipe',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to SoloWipe. Let's get to work.</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-600">
            {/* Header with gradient */}
            <Section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-t-lg px-10 py-12 text-center">
              <Heading className="text-white text-3xl font-bold m-0">
                SoloWipe
              </Heading>
            </Section>

            {/* Main content */}
            <Section className="bg-white rounded-b-lg px-10 py-12">
              <Heading className="text-gray-900 text-2xl font-semibold mt-0 mb-6">
                Welcome to SoloWipe!
              </Heading>

              <Text className="text-gray-700 text-base leading-relaxed mb-6">
                Hi {userEmail},
              </Text>

              <Text className="text-gray-700 text-base leading-relaxed mb-8">
                Thanks for joining SoloWipe! You're all set to streamline your service business and focus on what matters most—delivering great service to your customers.
              </Text>

              <Text className="text-gray-700 text-base leading-relaxed mb-8">
                Let's get to work.
              </Text>

              {/* CTA Button */}
              <Section className="text-center mb-8">
                <Button
                  className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg no-underline inline-block"
                  href={dashboardUrl}
                >
                  Go to Dashboard
                </Button>
              </Section>

              {/* Helpful links */}
              <Section className="border-t border-gray-200 pt-8 mt-8">
                <Text className="text-gray-600 text-sm mb-4">
                  <strong>Quick start tips:</strong>
                </Text>
                <Text className="text-gray-600 text-sm mb-2">
                  • Add your first customer to get started
                </Text>
                <Text className="text-gray-600 text-sm mb-2">
                  • Schedule recurring jobs automatically
                </Text>
                <Text className="text-gray-600 text-sm mb-0">
                  • Set up Direct Debit for seamless payments
                </Text>
              </Section>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-50 rounded-lg px-10 py-8 mt-4">
              <Text className="text-gray-600 text-sm mb-2">
                This email was sent by <strong>SoloWipe Team</strong>. If you have any questions, we're here to help.
              </Text>
              <Text className="text-gray-500 text-xs mt-4 mb-0">
                © {new Date().getFullYear()} SoloWipe. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WelcomeEmail;

