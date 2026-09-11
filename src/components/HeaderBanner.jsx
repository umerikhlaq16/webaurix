import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

/* ─────────────────────────────────────
   TYPEWRITER - cycles through words
───────────────────────────────────── */
const WORDS = ["work.", "grow.", "scale.", "matter."];

const useTypewriter = () => {
  const [text, setText] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [started, setStarted] = useState(false);

  /* delay first run so heading reveal finishes first */
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    const word = WORDS[wordIdx];

    if (!deleting && text === word) {
      const t = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setWordIdx((i) => (i + 1) % WORDS.length);
      return;
    }

    const speed = deleting ? 45 : 75;
    const t = setTimeout(() => {
      setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [text, deleting, wordIdx, started]);

  return { text, started };
};

/* ─────────────────────────────────────
   helpers
───────────────────────────────────── */
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
});

const RevealLine = ({ delay = 0, style = {}, className = "" }) => (
  <motion.span
    initial={{ scaleX: 0 }}
    animate={{ scaleX: 1 }}
    transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    style={{ transformOrigin: "left", ...style }}
    className={`block h-px ${className}`}
  />
);

/* ─────────────────────────────────────
   MARQUEE
───────────────────────────────────── */
const ITEMS = [
  "Web Development","·","Mobile Apps","·","UI/UX Design","·",
  "Custom Software","·","Digital Marketing","·","Brand Identity","·","E-Commerce","·",
];
const Marquee = ({ accent, muted }) => (
  <div className="overflow-hidden py-3.5" style={{ borderTop: `1px solid ${muted}22` }}>
    <motion.div
      animate={{ x: ["0%", "-50%"] }}
      transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      style={{ minWidth: "max-content" }}
      className="flex gap-10"
    >
      {[...ITEMS, ...ITEMS].map((item, i) => (
        <span
          key={i}
          style={{ color: item === "·" ? accent : muted }}
          className="text-[11px] font-semibold tracking-[0.16em] uppercase select-none"
        >
          {item}
        </span>
      ))}
    </motion.div>
  </div>
);

/* ─────────────────────────────────────
   SHINY SPOT
───────────────────────────────────── */
const Spot = ({ top, left, right, bottom, size, color, delay, opacity }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      top, left, right, bottom,
      width: size, height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      opacity,
      filter: "blur(2px)",
    }}
    animate={{ scale: [1, 1.35, 1], opacity: [opacity, opacity * 1.9, opacity] }}
    transition={{ duration: 4.5, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

/* ═══════════════════════════════════════
   MAIN HERO
═══════════════════════════════════════ */
export default function HeaderBanner() {
  const { isDark } = useTheme();
  const { text: typed, started } = useTypewriter();

  /* use window scrollY — avoids the container-position warning and gives
     correct values (0 at page top, increases as user scrolls down) */
  const { scrollY } = useScroll();
  const yShift  = useTransform(scrollY, [0, 700], ["0%", "12%"]);
  const fadeOut = useTransform(scrollY, [0, 500], [1, 0]);

  const bg      = isDark
    ? "linear-gradient(155deg, #0b0b0e 0%, #0d1017 55%, #0b0c10 100%)"
    : "linear-gradient(155deg, #ffffff 0%, #f4f7ff 60%, #ffffff 100%)";
  const primary = isDark ? "#f0eeec" : "#0c0c10";
  const muted   = isDark ? "rgba(240,238,236,0.42)" : "rgba(12,12,16,0.42)";
  const accent  = isDark ? "#68b5cc" : "#0e7490";
  const border  = isDark ? "rgba(240,238,236,0.1)" : "rgba(12,12,16,0.1)";

  /* shiny spot colors per theme */
  const spotColor1 = isDark ? "rgba(104,181,204,1)"  : "rgba(14,116,144,1)";
  const spotColor2 = isDark ? "rgba(255,255,255,1)"   : "rgba(56,189,248,1)";
  const spotColor3 = isDark ? "rgba(56,189,248,1)"    : "rgba(104,181,204,1)";

  const scrollToServices = () =>
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      className="relative w-full min-h-screen flex flex-col overflow-hidden"
      style={{ background: bg }}
    >
      {/* ── SHINY SPOTS (kept minimal — each is an infinite animation that
           costs main-thread time) ── */}
      <Spot top="8%"  left="12%" size={18} color={spotColor1} delay={0}   opacity={isDark ? 0.55 : 0.35} />
      <Spot top="6%"  right="18%"size={14} color={spotColor3} delay={2.1} opacity={isDark ? 0.5  : 0.3} />
      <Spot bottom="22%" right="20%"size={16} color={spotColor2} delay={1.5} opacity={isDark ? 0.4 : 0.2} />

      {/* subtle top radial tint */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "60%",
          background: isDark
            ? "radial-gradient(58% 42% at 50% -5%, rgba(104,181,204,0.08) 0%, transparent 100%)"
            : "radial-gradient(58% 42% at 50% -5%, rgba(14,116,144,0.06) 0%, transparent 100%)",
        }}
      />

      {/* ── CONTENT ── */}
      <motion.div
        style={{ y: yShift, opacity: fadeOut, willChange: "transform, opacity" }}
        className="relative z-10 flex-1 flex flex-col justify-center max-w-[1400px] mx-auto w-full px-5 sm:px-10 lg:px-16 pt-24 sm:pt-28 pb-8 sm:pb-10"
      >
        {/* HEADLINE */}
        <div className="mb-6 sm:mb-8">
          {/* line 1 — no clip, opacity fade so LCP registers on first paint */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            className="text-[32px] sm:text-[54px] lg:text-[74px] xl:text-[90px] font-bold leading-[1.1] tracking-[-0.02em]"
            style={{ color: primary }}
          >
            We design &amp;
          </motion.h1>

          {/* line 2 */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            className="text-[32px] sm:text-[54px] lg:text-[74px] xl:text-[90px] font-bold leading-[1.1] tracking-[-0.02em]"
            style={{ color: primary }}
          >
            build digital
          </motion.h1>

          {/* line 3 - typewriter */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            className="text-[32px] sm:text-[54px] lg:text-[74px] xl:text-[90px] font-bold leading-[1.1] tracking-[-0.02em]"
            style={{ color: primary }}
          >
            products that{" "}
            <span style={{ color: accent }}>
              {started ? typed : "work."}
              {started && (
                <span
                  className="inline-block rounded-sm ml-0.5 align-middle"
                  style={{
                    width: "clamp(2px, 0.5vw, 5px)",
                    height: "0.72em",
                    backgroundColor: accent,
                    verticalAlign: "middle",
                    animation: "cursorBlink 0.9s step-end infinite",
                  }}
                />
              )}
            </span>
          </motion.h1>
        </div>

        {/* divider */}
        <RevealLine
          delay={0.3}
          style={{ background: border }}
          className="mb-6 sm:mb-7 w-full max-w-[200px] sm:max-w-sm"
        />

        {/* description + CTAs */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 lg:gap-12">
          <motion.p
            {...rise(0.34)}
            className="max-w-[440px] text-[14px] sm:text-[16px] leading-[1.72]"
            style={{ color: muted }}
          >
            Webaurix is a web development and AI agency building fast websites,
            mobile apps, AI chatbots, and digital marketing that help brands grow
            across Pakistan, the US, the UK, and beyond.
          </motion.p>

          <motion.div {...rise(0.4)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link to="/start-project" className="w-full sm:w-auto">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl text-[13.5px] font-semibold cursor-pointer"
                style={{ backgroundColor: accent, color: isDark ? "#0b0b0e" : "#ffffff" }}
              >
                Start a Project 
                <ArrowUpRight size={14} />
              </motion.span>
            </Link>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={scrollToServices}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-[13.5px] font-semibold cursor-pointer"
              style={{ border: `1px solid ${border}`, color: muted, background: "transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = muted; }}
            >
              View Our Work
              <ArrowRight size={14} />
            </motion.button>
          </motion.div>
        </div>

        {/* STATS */}
        <motion.div
          {...rise(0.5)}
          className="mt-8 sm:mt-12 pt-6 sm:pt-8"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 sm:gap-x-8 sm:gap-y-7">
            {[
              { value: "50+", label: "Projects" },
              { value: "98%", label: "Satisfaction" },
              { value: "24h", label: "Response" },
              { value: "6",   label: "Services" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-[1.4rem] sm:text-[1.8rem] font-black leading-none tracking-tight" style={{ color: primary }}>
                  {value}
                </p>
                <p className="text-[10px] sm:text-[10.5px] font-medium tracking-[0.1em] uppercase mt-1" style={{ color: muted }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* MARQUEE */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="relative z-10 mt-auto"
      >
        <Marquee accent={accent} muted={muted} />
      </motion.div>
    </section>
  );
}
