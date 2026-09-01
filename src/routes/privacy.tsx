import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PolicyPage } from "@/components/policy-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | UMOBIPAY" },
      { name: "description", content: "Learn how UMOBIPAY protects your information and handles personal data with transparency and care." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PolicyPage
      badge="Privacy Policy"
      title="Your privacy, protected with clarity"
      intro="We use modern safeguards and straightforward practices to protect your data, your trust, and the integrity of each transaction you make with UMOBIPAY."
      icon={ShieldCheck}
      lastUpdated="11 August 2026"
      highlights={[
        "We collect only the information needed to provide secure payments and support services.",
        "Your account details are protected with layered encryption and access controls.",
        "We never sell your personal information to third parties for marketing.",
      ]}
      sections={[
        {
          heading: "What information we collect",
          body: "UMOBIPAY may collect personal information such as your name, mobile number, email address, transaction activity, and support communications. This helps us provide services such as bill payments, onboarding, and account support.",
          bullets: [
            "Basic account and identity information",
            "Transaction and payment metadata",
            "Customer support communications and feedback",
          ],
        },
        {
          heading: "How we use your information",
          body: "We use your data to deliver services, verify transactions, prevent fraud, improve reliability, and respond to customer needs. We also use this information to measure service quality and strengthen platform security.",
          bullets: [
            "Process payments and settlements",
            "Secure account access and authentication",
            "Provide customer support and resolve disputes",
          ],
        },
        {
          heading: "Your choices and controls",
          body: "You can contact us at any time to review, update, or request deletion of personal data where applicable. You may also choose not to share optional information when it is not required for the service.",
          bullets: [
            "Manage your account preferences",
            "Request access to or correction of your data",
            "Contact us for privacy-related questions",
          ],
        },
      ]}
    />
  );
}
