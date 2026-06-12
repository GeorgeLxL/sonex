"use client";

import { useState } from "react";

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
    <div className="mx-auto max-w-3xl">
      {faqs.map((f, idx) => (
        <div
          key={f.id}
          className="group px-5 py-4 cursor-pointer overflow-hidden shadow-md rounded mb-5 transition-all bg-surface hover:bg-line dark:bg-accent/10 dark:hover:bg-accent/20"
          onClick={() => handleClick(idx)}
        >
          <div className="flex list-none">
            <span className="text-lg mr-2 font-black text-accent/90">Q.</span>
            <span className="pt-[.1em] font-bold">{f.question}</span>
          </div>
          <div className="group-answer transition-height duration-300 ease-in-out overflow-hidden" style={{height: 0}}>
            <div className="flex text-sm pt-3">
              <span className="text-lg mr-2 font-black text-accent/90">A.</span>
              <span className="pt-[.2em]">{f.answer}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}