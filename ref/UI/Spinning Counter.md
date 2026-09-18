// Transitions.dev — Spinning counter (React, self-contained)
// Drop into any React project — no extra CSS file needed.

import { useEffect, useRef } from "react";

// ── Styles ──────────────────────────────────────────────
// Auto-injected on first import. Idempotent (guarded by
// the element id) and SSR-safe (no-ops without document).
const __TRANSITION_STYLES = `
:root {
  --reel-dur: 1400ms;
  --reel-cell: 30px;
  --reel-spin-blur: 3px;
  --reel-stagger: 90ms;
  --reel-ease: cubic-bezier(0.16, 1, 0.3, 1);
}

.t-reel { display: inline-flex; align-items: center; height: var(--reel-cell); font-variant-numeric: tabular-nums; }
.t-reel-col {
  position: relative; height: var(--reel-cell); overflow: hidden;
  /* Soft-fade the window edges instead of hard-cropping. */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
}
.t-reel-strip { display: flex; flex-direction: column; will-change: transform, filter; }
.t-reel-digit { height: var(--reel-cell); display: flex; align-items: center; justify-content: center; }
/* JS drives the tween: strip.style.transition =
     'transform var(--reel-dur) var(--reel-ease) ' + (col*var(--reel-stagger)) + 'ms';
   and decays each column's feGaussianBlur stdDeviation from
   var(--reel-spin-blur) to 0 over its own window. */

@media (prefers-reduced-motion: reduce) {
  .t-reel-strip { transition: none !important; filter: none !important; }
}
`;
if (typeof document !== "undefined" && !document.getElementById("transitions-p26")) {
  const __style = document.createElement("style");
  __style.id = "transitions-p26";
  __style.textContent = __TRANSITION_STYLES;
  document.head.appendChild(__style);
}

// Pair with the CSS from the CSS tab. Each digit is a clipped reel of
// 0-9 cells; the strip translates up (spins*10 + digit) cells to spin then
// land, with a per-column delay for a left-to-right cascade. (The vertical
// SVG motion-blur driver is omitted here for brevity — see the demo.)
const SPINS = 3, CELL = 30, DUR = 1400, STAGGER = 90;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export function Counter({ target = 100 }) {
  const ref = useRef(null);

  function build(str) {
    ref.current.innerHTML = "";
    const strips = [];
    [...str].forEach((ch) => {
      if (ch < "0" || ch > "9") {
        const sep = document.createElement("span");
        sep.className = "t-reel-sep";
        sep.textContent = ch;
        ref.current.appendChild(sep);
        return;
      }
      const col = document.createElement("span");
      col.className = "t-reel-col";
      const strip = document.createElement("span");
      strip.className = "t-reel-strip";
      for (let k = 0; k < (SPINS + 1) * 10 + 1; k++) {
        const cell = document.createElement("span");
        cell.className = "t-reel-digit";
        cell.textContent = String(k % 10);
        strip.appendChild(cell);
      }
      col.appendChild(strip);
      ref.current.appendChild(col);
      strips.push({ strip, digit: +ch });
    });
    return strips;
  }

  useEffect(() => {
    // Rest at 0.
    build("0").forEach(({ strip, digit }) => {
      strip.style.transform = `translateY(-${digit * CELL}px)`;
    });
  }, []);

  function spin() {
    const strips = build(Math.round(target).toLocaleString("en-US"));
    strips.forEach(({ strip }) => {
      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
    });
    void ref.current.offsetWidth;
    strips.forEach(({ strip, digit }, i) => {
      strip.style.transition = `transform ${DUR}ms ${EASE} ${i * STAGGER}ms`;
      strip.style.transform = `translateY(-${(SPINS * 10 + digit) * CELL}px)`;
    });
  }

  return (
    <>
      <div ref={ref} className="t-reel" aria-label={String(target)} />
      <button type="button" onClick={spin}>Animate</button>
    </>
  );
}
