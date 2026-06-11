import type { Metadata } from "next";
import { getContent, text } from "@/lib/content";
import { LegalPage } from "@/components/public/legal";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const content = await getContent(["legal.privacy"]);
  return (
    <LegalPage
      title={text(content, "legal.privacy", "title", "Privacy Policy")}
      updated={text(content, "legal.privacy", "updated")}
      body={text(
        content,
        "legal.privacy",
        "body",
        "Our privacy policy will be published here shortly. For questions about your data, please use the contact page.",
      )}
    />
  );
}
