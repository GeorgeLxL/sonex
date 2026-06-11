import type { Metadata } from "next";
import { getContent, text } from "@/lib/content";
import { LegalPage } from "@/components/public/legal";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const content = await getContent(["legal.terms"]);
  return (
    <LegalPage
      title={text(content, "legal.terms", "title", "Terms of Service")}
      updated={text(content, "legal.terms", "updated")}
      body={text(
        content,
        "legal.terms",
        "body",
        "Our terms of service will be published here shortly. For questions, please use the contact page.",
      )}
    />
  );
}
