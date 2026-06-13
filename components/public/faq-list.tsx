"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

/** Luxury accordion: hairline dividers, serif questions, gold +/− boxes. */
export function FaqList({ faqs }: { faqs: { id: string; question: string; answer: string }[] }) {
  const [active, setActive] = useState<number>(-1);

  const handleClick = (index: number) => {
    setActive((prevActive) => (prevActive === index ? -1 : index));
    const elements = document.getElementsByClassName("group-answer") as HTMLCollectionOf<HTMLElement>;
    for (let i = 0; i < elements.length; i++) {
      if (i === index) {
        elements[i].style.height = active === index ? "0px" : elements[i].scrollHeight + "px"; // Toggle height
      } else {
        elements[i].style.height = "0px"; // Collapse other items
      }
    }
  }

  if (!faqs.length) return null;
  return (
    <div className="mx-auto max-w-3xl border-t border-accent/15">
      {faqs.map((f, idx) => (
        <div key={f.id} className="border-b border-accent/15">
          <button
            type="button"
            onClick={() => handleClick(idx)}
            className="flex w-full items-center justify-between gap-6 py-6 text-left"
          >
            <span
              className={`font-display text-lg transition-colors ${active === idx ? "text-ink" : "text-ink/75"}`}
            >
              {f.question}
            </span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-accent/30 text-accent">
              {active === idx ? <Minus size={14} /> : <Plus size={14} />}
            </span>
          </button>
          <div
            className="group-answer overflow-hidden transition-[height] duration-300 ease-in-out"
            style={{ height: 0 }}
          >
            <p className="pb-7 pr-12 text-sm font-light leading-relaxed text-muted">{f.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
