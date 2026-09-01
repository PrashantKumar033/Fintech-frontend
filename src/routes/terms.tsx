import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PolicyPage } from "@/components/policy-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use | UMOBIPAY" },
      { name: "description", content: "Review UMOBIPAY's terms of use for using our platform, services, and customer support." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PolicyPage
      badge="Terms of Use"
      title="Using UMOBIPAY responsibly"
      intro="These terms define the responsibilities of both UMOBIPAY and our users so every payment experience remains transparent, secure, and reliable."
      icon={FileText}
      lastUpdated="11 August 2026"
      highlights={[
        "You agree to use the platform only for lawful and honest transactions.",
        "All account credentials must be kept secure and confidential.",
        "UMOBIPAY reserves the right to suspend misuse or suspicious activity.",
      ]}
      sections={[
        {
          heading: "Service use guidelines",
          body: "By using UMOBIPAY, you agree to provide accurate information, comply with applicable laws, and use our services fairly and responsibly. You must not attempt to interfere with platform operations, exploit vulnerabilities, or misuse customer data.",
          bullets: [
            "Use accurate account and transaction information",
            "Do not share login credentials with others",
            "Avoid spam, abuse, or fraudulent activity",
          ],
        },
        {
          heading: "Account and security responsibilities",
          body: "You are responsible for keeping your account secure, ensuring the accuracy of provided details, and promptly reporting suspicious activity. UMOBIPAY may request verification information to confirm your identity when required.",
          bullets: [
            "Protect your password and OTPs",
            "Report suspicious transactions immediately",
            "Keep your registered contact details up to date",
          ],
        },
        {
          heading: "Limitations and updates",
          body: "UMOBIPAY may update these terms from time to time to reflect legal requirements, feature improvements, or service changes. Continued use of the platform after updates means you accept the revised terms.",
          bullets: [
            "Terms may change with notice",
            "Continued use implies acceptance",
            "Please review the latest version regularly",
          ],
        },
      ]}
    />
  );
}
