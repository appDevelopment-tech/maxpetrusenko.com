"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
  rating?: number;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    quote: "Max has an extraordinary ability to hold space. The session was transformative — I felt seen, safe, and deeply held throughout.",
    author: "Sarah K.",
    role: "Founder, Tech Startup",
    rating: 5,
  },
  {
    id: "2",
    quote: "The tantra massage was exactly what I needed — professional, boundary-conscious, and profoundly relaxing. I left feeling renewed in body and mind.",
    author: "James M.",
    role: "Software Engineer",
    rating: 5,
  },
  {
    id: "3",
    quote: "Working with Max on automation saved our team countless hours. But it was his embodied presence that made the collaboration feel truly special.",
    author: "Elena R.",
    role: "Operations Director",
    rating: 5,
  },
  {
    id: "4",
    quote: "The somatic session unlocked something I didn't know was stuck. Max's intuitive approach to energy work is rare and precious.",
    author: "Michael T.",
    role: "Creative Director",
    rating: 5,
  },
];

export function LivingTestimonials({ className = "" }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      next();
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const current = testimonials[currentIndex];
  const rating = current.rating ?? 0;

  return (
    <div className={`living-testimonials ${className}`}>
      <div className="relative">
        {/* Testimonial Card */}
        <div className="relative overflow-hidden rounded-[24px] border border-[rgba(12,17,21,0.08)] bg-white/95 p-8 shadow-[0_20px_50px_rgba(12,17,21,0.1)]">
          {/* Quote Icon */}
          <Quote className="w-10 h-10 text-[var(--accent-spirit)] opacity-20 mb-4" />

          {/* Quote */}
          <blockquote className="text-lg md:text-xl leading-relaxed text-[var(--ink-soft)] italic mb-6 min-h-[120px]">
            "{current.quote}"
          </blockquote>

          {/* Author */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--ink)]">{current.author}</p>
              {current.role && (
                <p className="text-sm text-[var(--muted)]">{current.role}</p>
              )}
            </div>

            {/* Rating */}
            {rating > 0 && (
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < rating ? "text-amber-400" : "text-gray-300"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="mt-6 flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentIndex(i);
                  setIsAutoPlaying(false);
                }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "flex-1 bg-[var(--accent-spirit)]"
                    : "w-6 bg-[rgba(12,17,21,0.1)] hover:bg-[rgba(12,17,21,0.2)]"
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={() => {
            prev();
            setIsAutoPlaying(false);
          }}
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-[rgba(12,17,21,0.1)] shadow-lg flex items-center justify-center hover:bg-[var(--sand)] hover:scale-110 transition-all duration-200"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--ink)]" />
        </button>
        <button
          onClick={() => {
            next();
            setIsAutoPlaying(false);
          }}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-[rgba(12,17,21,0.1)] shadow-lg flex items-center justify-center hover:bg-[var(--sand)] hover:scale-110 transition-all duration-200"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5 text-[var(--ink)]" />
        </button>
      </div>

      {/* Live Indicator */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-spirit)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-spirit)]" />
        </span>
        <span className="text-xs text-[var(--muted)]">Recent client experiences</span>
      </div>
    </div>
  );
}
