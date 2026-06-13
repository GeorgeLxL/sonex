"use client";

import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay } from "swiper/modules";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import "swiper/css";

export interface TestimonialData {
  id: string;
  quote: string;
  author: string;
  company: string;
}

/** One testimonial card. `hl` = focused/highlighted (brand gradient) treatment. */
function TestimonialCard({ t, hl }: { t: TestimonialData; hl: boolean }) {
  return (
    <figure
      // Identical padding in both states — only transform/opacity/colors may
      // differ, so the slider's height stays constant while swiping.
      className={`relative flex h-full flex-col overflow-hidden border bg-surface p-6 transition-all duration-500 md:p-8 ${
        hl
          ? "scale-100 border-accent/50"
          : "scale-90 border-accent/15 opacity-60"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgb(var(--accent)/0.07)_0%,transparent_70%)] transition-opacity duration-500 ${hl ? "opacity-100" : "opacity-0"}`}
      />
      <span
        aria-hidden
        className="absolute right-5 top-2 font-display text-6xl italic leading-none text-accent/15"
      >
        &rdquo;
      </span>
      <div className="relative flex gap-0.5 text-accent">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
        ))}
      </div>
      <blockquote className="relative mb-5 mt-4 font-display text-base italic leading-relaxed text-ink/85">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="relative mt-auto flex items-center gap-3 border-t border-accent/15 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-accent/40 font-mono text-xs text-accent">
          {t.author.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <span className="text-sm font-medium">
          {t.author}
          <span className="mt-0.5 block font-mono text-[0.68rem] uppercase tracking-[0.12em] text-accent">
            {t.company}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Swiper-powered infinite carousel: focused slide centered with the gradient
 *  highlight, neighbours half-shown at the edges. */
export function TestimonialSlider({ items }: { items: TestimonialData[] }) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [active, setActive] = useState(0);

  const n = items.length;
  if (n === 0) return null;

  // Swiper's loop mode needs ~(slidesPerView * 2 + 1) slides to work with
  // centeredSlides — with few testimonials, repeat the list until safe.
  const copies = n >= 6 ? 1 : Math.ceil(6 / n);
  const slides = Array.from({ length: copies }, () => items).flat();

  // Jump to the duplicate of item `i` closest to the current position so the
  // dots always take the short way round.
  const goTo = (i: number) => {
    const s = swiperRef.current;
    if (!s) return;
    const total = slides.length;
    const r = s.realIndex;
    let best = i;
    let bestDist = Infinity;
    for (let c = i; c < total; c += n) {
      const d = Math.min((c - r + total) % total, (r - c + total) % total);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    s.slideToLoop(best);
  };

  const arrow =
    "flex h-10 w-10 items-center justify-center border border-accent/25 bg-transparent text-muted transition-colors hover:border-accent/60 hover:text-accent";

  return (
    <div>
      <Swiper
        modules={[Autoplay]}
        onSwiper={(s) => {
          swiperRef.current = s;
        }}
        onSlideChange={(s) => setActive(s.realIndex % n)}
        loop
        centeredSlides
        grabCursor
        slidesPerView={1.15}
        spaceBetween={16}
        breakpoints={{ 768: { slidesPerView: 2, spaceBetween: 24 } }}
        autoplay={{ delay: 6000, pauseOnMouseEnter: true }}
      >
        {slides.map((t, i) => (
          // flex => the card stretches to the slide height (percentage heights
          // don't resolve inside Swiper's auto-height wrapper); extra bottom
          // padding gives the card's drop shadow room before the overflow cut
          <SwiperSlide key={`${Math.floor(i / n)}-${t.id}`} className="flex !h-auto pb-10 pt-4">
            {({ isActive }) => <TestimonialCard t={t} hl={isActive} />}
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="mt-4 flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label="Previous testimonial"
          className={arrow}
          onClick={() => swiperRef.current?.slidePrev()}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          {items.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Go to testimonial ${i + 1}`}
              className={`h-1.5 transition-all ${i === active ? "w-6 bg-accent" : "w-1.5 bg-accent/20 hover:bg-accent/40"}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next testimonial"
          className={arrow}
          onClick={() => swiperRef.current?.slideNext()}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
