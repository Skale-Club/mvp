import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Sparkles,
  Users,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Package,
  Repeat,
  Ban,
  Lock,
  Link,
  Bell,
  Gavel,
  Mail,
} from "lucide-react";
import type { CompanySettings } from "@shared/schema";

export default function TermsOfService() {
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
  });

  const companyName = settings?.companyName || "Company Name";
  const companyEmail = settings?.companyEmail || "";
  const companyPhone = settings?.companyPhone || "";
  const companyAddress = settings?.companyAddress || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="bg-primary text-white pt-28 pb-16">
        <div className="container-custom">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-10 h-10" />
            <h1 className="text-4xl font-bold font-heading text-white">Terms of Service</h1>
          </div>
          <p className="text-primary-foreground/80 text-lg max-w-2xl">
            These terms govern your use of {companyName}'s website and services. Please read them carefully before booking or using our platform.
          </p>
          <p className="text-primary-foreground/60 mt-4 text-sm">
            Last updated: February 14, 2026
          </p>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="space-y-12">
          <Section icon={<ShieldCheck className="w-6 h-6" />} title="1. Acceptance of Terms">
            <p>By accessing the site, creating an account, or booking services with {companyName}, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use our services.</p>
          </Section>

          <Section icon={<Sparkles className="w-6 h-6" />} title="2. Services and Scope">
            <p>{companyName} provides professional services as described on our website. Service details, deliverables, and exclusions may vary by package and engagement type. Specific terms for each service will be communicated during the booking process.</p>
          </Section>

          <Section icon={<Users className="w-6 h-6" />} title="3. Eligibility and Accounts">
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 18 years old and legally able to enter binding contracts.</li>
              <li>You agree to provide accurate contact and billing information and to keep it updated.</li>
              <li>You are responsible for safeguarding account credentials and all activity under your account.</li>
            </ul>
          </Section>

          <Section icon={<CreditCard className="w-6 h-6" />} title="4. Quotes, Pricing, and Payments">
            <ul className="list-disc pl-6 space-y-2">
              <li>Prices, estimates, and promotions are shown at checkout and may adjust based on project scope, add-ons, or special requests.</li>
              <li>Taxes and fees may apply. We may place an authorization hold or charge your payment method per the booking terms.</li>
              <li>If project conditions differ materially from the booking details, we may adjust the scope or pricing with your consent before proceeding.</li>
            </ul>
          </Section>

          <Section icon={<Calendar className="w-6 h-6" />} title="5. Scheduling, Rescheduling, and Cancellations">
            <ul className="list-disc pl-6 space-y-2">
              <li>Appointments are subject to availability. Arrival or start times may include a service window.</li>
              <li>Reschedules or cancellations should be requested as early as possible. Late changes may incur a fee if notice is shorter than the policy shown at booking.</li>
              <li>We may reschedule or cancel due to unsafe conditions, severe weather, or events outside our control; in such cases we will work with you to find a new time.</li>
            </ul>
          </Section>

          <Section icon={<CheckCircle2 className="w-6 h-6" />} title="6. Service Quality and Satisfaction">
            <ul className="list-disc pl-6 space-y-2">
              <li>Services are performed according to the scope and specifications agreed upon at booking.</li>
              <li>If you are not satisfied with the results, contact us within 48 hours with details. We will review and may offer corrections or adjustments at our discretion.</li>
              <li>Satisfaction guarantees do not cover changes in project scope, additional requests, or issues unrelated to the original service.</li>
            </ul>
          </Section>

          <Section icon={<AlertTriangle className="w-6 h-6" />} title="7. Customer Responsibilities">
            <ul className="list-disc pl-6 space-y-2">
              <li>Treat our staff respectfully and provide a safe working environment free from harassment, discrimination, or threats.</li>
              <li>Provide accurate project details and any special requirements before service begins.</li>
              <li>Ensure timely access to any necessary locations, materials, or information required for service delivery.</li>
            </ul>
          </Section>

          <Section icon={<Package className="w-6 h-6" />} title="8. Materials and Intellectual Property">
            <ul className="list-disc pl-6 space-y-2">
              <li>Any materials, content, or deliverables created as part of our services are subject to the specific terms agreed upon for each engagement.</li>
              <li>You are responsible for providing accurate information and approving any deliverables before final completion.</li>
            </ul>
          </Section>

          <Section icon={<Repeat className="w-6 h-6" />} title="9. Recurring Services and Subscriptions">
            <ul className="list-disc pl-6 space-y-2">
              <li>Recurring schedules are subject to availability and may shift around holidays.</li>
              <li>Pricing may change if the scope or frequency changes. We will notify you of adjustments before charging.</li>
              <li>You may pause or cancel recurring services with notice as described during booking.</li>
            </ul>
          </Section>

          <Section icon={<Ban className="w-6 h-6" />} title="10. Limitations of Liability">
            <ul className="list-disc pl-6 space-y-2">
              <li>To the fullest extent permitted by law, we are not liable for indirect, incidental, or consequential damages.</li>
              <li>Our aggregate liability for any claim is limited to the amount you paid for the service giving rise to the claim.</li>
              <li>We are not responsible for losses arising from inaccurate information provided by the customer or circumstances beyond our control.</li>
            </ul>
          </Section>

          <Section icon={<Lock className="w-6 h-6" />} title="11. Intellectual Property and Acceptable Use">
            <ul className="list-disc pl-6 space-y-2">
              <li>All site content, trademarks, and materials are owned by {companyName} or its licensors and may not be copied or used without permission.</li>
              <li>You agree not to misuse the site (including scraping, reverse engineering, or interfering with security features) or use our brand without consent.</li>
            </ul>
          </Section>

          <Section icon={<Link className="w-6 h-6" />} title="12. Third-Party Services and Links">
            <p>We may reference or integrate third-party services (e.g., payments, scheduling). Those providers' terms and privacy policies apply to their services; we are not responsible for their content or practices.</p>
          </Section>

          <Section icon={<Bell className="w-6 h-6" />} title="13. Changes and Termination">
            <ul className="list-disc pl-6 space-y-2">
              <li>We may update these terms periodically. The "Last updated" date reflects the latest version. Continued use after changes means you accept the revised terms.</li>
              <li>We may suspend or terminate access if you violate these terms or engage in fraud or abuse.</li>
            </ul>
          </Section>

          <Section icon={<Gavel className="w-6 h-6" />} title="14. Governing Law and Dispute Resolution">
            <p>These terms are governed by the laws of the jurisdiction where {companyName} operates, without regard to conflict-of-law principles. Please contact us first to try to resolve any issue informally.</p>
          </Section>

          <Section icon={<Mail className="w-6 h-6" />} title="15. Contact">
            <p>If you have questions or concerns about these Terms of Service, contact us:</p>
            <div className="mt-4 p-6 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-900">{companyName}</p>
              {companyEmail && (
                <p className="text-gray-600 mt-2">
                  Email: <a href={`mailto:${companyEmail}`} className="text-primary hover:underline">{companyEmail}</a>
                </p>
              )}
              {companyPhone && (
                <p className="text-gray-600">
                  Phone: <a href={`tel:${companyPhone}`} className="text-primary hover:underline">{companyPhone}</a>
                </p>
              )}
              {companyAddress && (
                <p className="text-gray-600">Address: {companyAddress}</p>
              )}
            </div>
            <p className="mt-4 text-gray-600">We aim to respond to inquiries within 30 days.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-primary">{icon}</div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="prose prose-gray max-w-none space-y-4 text-gray-600">
        {children}
      </div>
    </section>
  );
}
