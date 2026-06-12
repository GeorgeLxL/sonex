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
      className={`relative flex h-full flex-col overflow-hidden rounded border bg-surface p-6 transition-all duration-500 md:p-8 ${
        hl
          ? "scale-100 border-[#6366f1] text-white shadow-xl shadow-accent/25 dark:border-[#372f9e]"
          : "scale-90 border-line/60 opacity-70 shadow-md shadow-black/5"
      }`}
    >
      {/* background-image can't animate, so the gradient lives on its own
          layer and cross-fades over the flat bg-surface */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] transition-opacity duration-500 dark:from-[#372f9e] dark:to-[#4c1d95] ${hl ? "opacity-100" : "opacity-0"}`}
      />
      <span
        aria-hidden
        className={`absolute right-5 top-2 font-display text-6xl leading-none transition-colors duration-500 ${hl ? "text-white/15" : "text-accent/10"}`}
      >
        &rdquo;
      </span>
      <div className={`relative flex gap-0.5 transition-colors duration-500 ${hl ? "text-amber-300" : "text-warning"}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
        ))}
      </div>
      <blockquote
        className={`relative mb-5 mt-3 text-sm leading-relaxed transition-colors duration-500 ${hl ? "text-white/90" : "text-ink/90"}`}
      >
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption
        className={`relative mt-auto flex items-center gap-3 border-t pt-4 transition-colors duration-500 ${hl ? "border-white/20" : "border-line"}`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-500 ${hl ? "bg-white text-[#6366f1]" : "bg-accent text-white"}`}
        >
          {t.author.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <span className="text-sm font-semibold">
          {t.author}
          <span
            className={`block text-xs font-normal transition-colors duration-500 ${hl ? "text-white/70" : "text-muted"}`}
          >
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
    "flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-surface text-accent shadow-md transition-colors hover:bg-accent hover:text-white";

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
              className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-accent" : "w-2 bg-line hover:bg-accent/40"}`}
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
