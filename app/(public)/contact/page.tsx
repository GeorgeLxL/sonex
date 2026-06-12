import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text } from "@/lib/content";
import { Section } from "@/components/public/sections";
import { PageHero } from "@/components/public/page-hero";
import { ContactForm } from "@/components/public/forms";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const db = await supabaseServer();
  const content = await getContent(["contact.info"]);
  const email = text(content, "contact.info", "email", "hello@example.com");
  const phone = text(content, "contact.info", "phone");

  return (
    <>
      <PageHero
        title="Contact"
        sub="Tell us what you are building. We reply within one business day."
      />

      <Section>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
          <aside className="space-y-4">
            <div className="rounded border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold">Contact info</h2>
              <ul className="mt-3 space-y-3 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <Mail size={15} className="text-accent" />
                  <a href={`mailto:${email}`} className="hover:text-accent hover:underline">
                    {email}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={15} className="text-accent" />
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="hover:text-accent hover:underline">
                    {phone}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-accent" />
                  {text(content, "contact.info", "address")}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
