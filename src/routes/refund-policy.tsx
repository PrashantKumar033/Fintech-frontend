import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { PolicyPage } from "@/components/policy-page";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy | UMOBIPAY" },
      { name: "description", content: "Understand UMOBIPAY's refund and dispute handling process for payments and service issues." },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <PolicyPage
      badge="Refund Policy"
      title="Fast support for payment concerns"
      intro="We aim to resolve payment issues quickly and fairly. If a transaction is incorrect, duplicated, or fails unexpectedly, our team will review it as soon as possible."
      icon={RotateCcw}
      lastUpdated="11 August 2026"
      highlights={[
        "Refunds are considered case by case based on the transaction status and service rules.",
        "Disputes are reviewed by our support team with priority and transparency.",
        "Customers should raise concerns promptly to improve chances of a fast resolution.",
      ]}
      sections={[
        {
          heading: "When refunds may be considered",
          body: "Refunds may be considered when a payment is made in error, a transaction fails after deduction, or a duplicate charge is detected. Each case is reviewed based on the payment gateway response and applicable service rules.",
          bullets: [
            "Duplicate or incorrect transactions",
            "Failed transactions with confirmed debit",
            "Service issues that prevent successful completion",
          ],
        },
        {
          heading: "How to raise a request",
          body: "Please contact our support team with the transaction reference, registered mobile number, and a short summary of the issue. We recommend raising requests as soon as possible so we can act quickly.",
          bullets: [
            "Use your registered contact details",
            "Share transaction ID and timestamp",
            "Include screenshots if available",
          ],
        },
        {
          heading: "Resolution timeline",
          body: "Once a request is received, our team will review the case and provide an update. Resolution times depend on the nature of the issue, payment partner confirmation, and verification requirements.",
          bullets: [
            "Initial review usually within 1 business day",
            "Complex cases may take longer",
            "We will keep you informed throughout the process",
          ],
        },
      ]}
    />
  );
}
