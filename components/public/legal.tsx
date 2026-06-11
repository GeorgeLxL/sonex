import { Section } from "@/components/public/sections";
import { formatDateHuman } from "@/lib/dates";

/** Renders legal copy: "## " lines = headings, blank lines = paragraphs. */
export function LegalPage({
  title,
  updated,
  body,
}: {
  title: string;
  updated?: string;
  body: string;
}) {
  const blocks = body.split(/\n{2,}/).filter((b) => b.trim());

  return (
    <Section>
      <div className="mx-auto max-w-3xl py-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {updated && (
          <p className="mt-2 text-sm text-muted">Last updated {formatDateHuman(updated)}</p>
        )}
        <div className="mt-8 space-y-4">
          {blocks.map((block, i) =>
            block.startsWith("## ") ? (
              <h2 key={i} className="pt-4 text-lg font-semibold">
                {block.slice(3)}
              </h2>
            ) : (
              <p key={i} className="leading-relaxed text-muted">
                {block}
              </p>
            ),
          )}
        </div>
      </div>
    </Section>
  );
}
