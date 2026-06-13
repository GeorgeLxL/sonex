import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getContent, text } from "@/lib/content";
import { Section } from "@/components/public/sections";
import { PageHero } from "@/components/public/page-hero";
import { ContactForm } from "@/components/public/forms";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tell us what you are building — we reply within one business day.",
};

export default async function ContactPage() {
  const db = await supabaseServer();
  const content = await getContent(["contact.info"]);
  // No placeholder fallbacks — unset CMS fields simply don't render.
  const email = text(content, "contact.info", "email");
  const phone = text(content, "contact.info", "phone");
  const address = text(content, "contact.info", "address");

  return (
    <>
      <PageHero
        title="Contact"
        sub="Tell us what you are building. We reply within one business day."
        bg='contact'
      />

      <Section>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
          <aside className="space-y-4">
            {(email || phone || address) && (
              <div className="border border-accent/20 bg-surface p-6">
                <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.25em] text-accent">Contact info</h2>
                <ul className="mt-4 space-y-3 text-sm font-light text-muted">
                  {email && (
                    <li className="flex items-center gap-2">
                      <Mail size={15} className="text-accent" />
                      <a href={`mailto:${email}`} className="hover:text-accent hover:underline">
                        {email}
                      </a>
                    </li>
                  )}
                  {phone && (
                    <li className="flex items-center gap-2">
                      <Phone size={15} className="text-accent" />
                      <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="hover:text-accent hover:underline">
                        {phone}
                      </a>
                    </li>
                  )}
                  {address && (
                    <li className="flex items-start gap-2">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-accent" />
                      {address}
                    </li>
                  )}
                </ul>
              </div>
            )}
            <div className="border border-accent/15 bg-accent/[.03] p-6">
              <p className="font-display text-sm italic leading-relaxed text-muted">
                {text(
                  content,
                  "contact.info",
                  "note",
                  "We respond to every enquiry within one business day. If your project is a good fit, we'll schedule a 30-minute call to understand the details — no pitch, no fluff.",
                )}
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
