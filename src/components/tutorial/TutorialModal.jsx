import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";

const SLIDE_DURATION = 6000;

function Slide1() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-8">
      {/* Logo with glow */}
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl scale-150 animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <span className="font-display text-3xl font-bold text-primary">T</span>
        </div>
      </div>
      <div className="space-y-3 max-w-lg">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight">
          Você não se tornou concierge para passar horas em planilhas.
        </h2>
        <p className="text-lg text-muted-foreground font-body">
          Você está aqui para criar experiências extraordinárias.
        </p>
      </div>
    </div>
  );
}

function Slide1En() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-8">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl scale-150 animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <span className="font-display text-3xl font-bold text-primary">T</span>
        </div>
      </div>
      <div className="space-y-3 max-w-lg">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight">
          You didn't become a concierge to spend hours on spreadsheets.
        </h2>
        <p className="text-lg text-muted-foreground font-body">
          You're here to create extraordinary experiences.
        </p>
      </div>
    </div>
  );
}

function Slide1Es() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-8">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl scale-150 animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <span className="font-display text-3xl font-bold text-primary">T</span>
        </div>
      </div>
      <div className="space-y-3 max-w-lg">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight">
          No te convertiste en concierge para pasar horas en hojas de cálculo.
        </h2>
        <p className="text-lg text-muted-foreground font-body">
          Estás aquí para crear experiencias extraordinarias.
        </p>
      </div>
    </div>
  );
}

function Slide2({ t }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-8">
      {/* Chaos icon cluster */}
      <div className="relative w-28 h-28">
        {[
          { label: "📊", rotate: "-12deg", x: "-20px", y: "0px", delay: "0s" },
          { label: "🔔", rotate: "8deg", x: "20px", y: "-8px", delay: "0.3s" },
          { label: "📱", rotate: "-5deg", x: "0px", y: "12px", delay: "0.6s" },
        ].map((item, i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center text-3xl"
            style={{
              transform: `rotate(${item.rotate}) translate(${item.x}, ${item.y})`,
              animation: `float${i} 3s ease-in-out infinite`,
              animationDelay: item.delay,
            }}
          >
            {item.label}
          </div>
        ))}
        <style>{`
          @keyframes float0 { 0%,100%{transform:rotate(-12deg) translate(-20px,0px)} 50%{transform:rotate(-12deg) translate(-20px,-6px)} }
          @keyframes float1 { 0%,100%{transform:rotate(8deg) translate(20px,-8px)} 50%{transform:rotate(8deg) translate(20px,-14px)} }
          @keyframes float2 { 0%,100%{transform:rotate(-5deg) translate(0px,12px)} 50%{transform:rotate(-5deg) translate(0px,6px)} }
        `}</style>
      </div>
      <div className="space-y-3 max-w-lg">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
          {t("tut_s2_title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("tut_s2_text")}
        </p>
      </div>
    </div>
  );
}

function Slide3({ t }) {
  const [cardPos, setCardPos] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCardPos(p => (p + 1) % 3);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const cols = [
    { label: "Lead", color: "bg-blue-500/20 border-blue-500/30 text-blue-400" },
    { label: t("status_proposta"), color: "bg-amber-500/20 border-amber-500/30 text-amber-400" },
    { label: t("status_confirmado"), color: "bg-green-500/20 border-green-500/30 text-green-400" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-8">
      {/* Mini pipeline animation */}
      <div className="flex gap-2 items-start">
        {cols.map((col, i) => (
          <div key={i} className="w-20 md:w-24">
            <div className={`text-[10px] font-mono uppercase tracking-wider mb-2 ${i === cardPos ? col.color.split(" ")[2] : "text-muted-foreground"} font-bold`}>
              {col.label}
            </div>
            <div className={`h-16 rounded-lg border ${i === cardPos ? col.color : "border-border/30 bg-card/30"} flex items-center justify-center transition-all duration-500`}>
              {i === cardPos && (
                <div className="w-10 h-8 rounded bg-white/10 border border-white/20 flex flex-col gap-1 p-1">
                  <div className="h-1 bg-primary/60 rounded" />
                  <div className="h-1 bg-muted-foreground/40 rounded w-3/4" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 max-w-lg">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
          {t("tut_s3_title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("tut_s3_text")}
        </p>
      </div>
    </div>
  );
}

function Slide4({ t }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-8">
      {/* Animated AI badge */}
      <div className="relative">
        <div
          className="text-3xl font-mono font-bold px-6 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary"
          style={{ animation: "aiPulse 2s ease-in-out infinite" }}
        >
          ✦ IA
        </div>
        <style>{`
          @keyframes aiPulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(240,122,46,0); transform: scale(1); }
            50% { box-shadow: 0 0 30px 8px rgba(240,122,46,0.2); transform: scale(1.05); }
          }
        `}</style>
      </div>
      <div className="space-y-3 max-w-lg">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
          {t("tut_s4_title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("tut_s4_text")}
        </p>
      </div>
    </div>
  );
}

function Slide5({ t }) {
  const [heights, setHeights] = useState([20, 40, 30, 60, 50]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setHeights([45, 70, 55, 90, 75]);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-8">
      {/* Mini bar chart growing */}
      <div className="flex items-end gap-2 h-20">
        {heights.map((h, i) => (
          <div
            key={i}
            className="w-6 md:w-8 rounded-t transition-all duration-1000 ease-out"
            style={{
              height: `${h}%`,
              background: `hsl(${43 + i * 5} ${50 + i * 3}% ${45 + i * 4}%)`,
              transitionDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
      <div className="space-y-3 max-w-lg">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
          {t("tut_s5_title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("tut_s5_text")}
        </p>
      </div>
    </div>
  );
}

function Slide6({ t, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-8 px-8">
      {/* Logo with shimmer */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-3xl scale-150" style={{ animation: "shimmerGlow 3s ease-in-out infinite" }} />
        <div className="relative w-24 h-24 rounded-2xl bg-primary/10 border border-primary/40 flex items-center justify-center">
          <span className="font-display text-4xl font-bold text-primary">T</span>
        </div>
        <style>{`
          @keyframes shimmerGlow {
            0%,100% { opacity: 0.3; transform: scale(1.2); }
            50% { opacity: 0.7; transform: scale(1.6); }
          }
        `}</style>
      </div>
      <div className="space-y-3 max-w-lg">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
          {t("tut_s6_title")}
        </h2>
      </div>
      <button
        onClick={() => { navigate("/"); onClose(); }}
        className="px-8 py-4 rounded-xl font-semibold text-base text-primary-foreground transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, hsl(24 87% 56%), hsl(18 86% 41%))", boxShadow: "0 0 32px rgba(240,122,46,0.35)" }}
      >
        {t("tut_s6_cta")}
      </button>
    </div>
  );
}

// Slide map by language
function getSlide(index, lang, t, onClose) {
  if (index === 0) {
    if (lang === "en") return <Slide1En />;
    if (lang === "es") return <Slide1Es />;
    return <Slide1 />;
  }
  if (index === 1) return <Slide2 t={t} />;
  if (index === 2) return <Slide3 t={t} />;
  if (index === 3) return <Slide4 t={t} />;
  if (index === 4) return <Slide5 t={t} />;
  return <Slide6 t={t} onClose={onClose} />;
}

const TOTAL_SLIDES = 6;

export default function TutorialModal({ open, onClose }) {
  const { t, lang } = useLanguage();
  const [slide, setSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);

  const goTo = useCallback((idx) => {
    setFading(true);
    setTimeout(() => {
      setSlide(idx);
      setProgress(0);
      setFading(false);
    }, 250);
  }, []);

  const next = useCallback(() => {
    if (slide < TOTAL_SLIDES - 1) goTo(slide + 1);
  }, [slide, goTo]);

  const prev = useCallback(() => {
    if (slide > 0) goTo(slide - 1);
  }, [slide, goTo]);

  // Auto-advance & progress bar
  useEffect(() => {
    if (!open) return;
    setProgress(0);
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);
    }, 50);
    intervalRef.current = setTimeout(() => {
      if (slide < TOTAL_SLIDES - 1) {
        next();
      }
    }, SLIDE_DURATION);
    return () => {
      clearInterval(progressRef.current);
      clearTimeout(intervalRef.current);
    };
  }, [open, slide]);

  // Open/close animation
  useEffect(() => {
    if (open) {
      setSlide(0);
      setProgress(0);
      setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open && !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        background: "rgba(5,5,4,0.95)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: "hsl(220 15% 9%)",
          border: "1px solid hsl(24 87% 56% / 0.2)",
          boxShadow: "0 0 80px rgba(240,122,46,0.08)",
          height: "min(90vh, 560px)",
        }}
      >
        {/* Gold progress bar */}
        <div className="h-1 w-full bg-border/30">
          <div
            className="h-full transition-none"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, hsl(20 79% 48%), hsl(24 87% 56%))",
            }}
          />
        </div>

        {/* Slide dots */}
        <div className="flex justify-center gap-1.5 pt-4 px-6">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === slide ? "24px" : "8px",
                background: i === slide ? "hsl(24 87% 56%)" : "hsl(220 12% 25%)",
              }}
            />
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Slide content */}
        <div
          className="h-[calc(100%-80px)]"
          style={{
            opacity: fading ? 0 : 1,
            transform: fading ? "translateY(6px)" : "translateY(0)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
          }}
        >
          {getSlide(slide, lang, t, onClose)}
        </div>

        {/* Navigation */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={slide === 0}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("tut_prev")}
          </button>

          <span className="text-xs text-muted-foreground font-mono">
            {slide + 1} / {TOTAL_SLIDES}
          </span>

          {slide < TOTAL_SLIDES - 1 ? (
            <button
              onClick={next}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("tut_next")}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("tut_skip")}
            </button>
          )}
        </div>

        {/* Skip button top-left */}
        {slide < TOTAL_SLIDES - 1 && (
          <button
            onClick={onClose}
            className="absolute top-3 left-4 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t("tut_skip")}
          </button>
        )}
      </div>
    </div>
  );
}