import React from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   TerminalShell
   Global CRT wrapper for Mission Control.

   Layers (z-index, back → front):
     z-0   bg-black base
     z-10  content
     z-20  scanlines  (CSS gradient stripes)
     z-30  vignette   (radial-gradient alpha overlay)
     z-40  flicker    (low-opacity noise plane animated)
     z-50  phosphor   (inset box-shadow that emits a green halo from the edges)
   ───────────────────────────────────────────────────────────────────────────── */

export default function TerminalShell({
  children,
  chatTyping,
}: {
  children: React.ReactNode;
  chatTyping?: boolean;
}) {
  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-black text-[#00ff41] font-mono
                 selection:bg-[#00ff41] selection:text-black"
      style={{ isolation: 'isolate' }}
    >
      {/* ── Content ── */}
      <div
        className={`relative z-10 flex h-full flex-col p-6 transition-all duration-300 ${
          chatTyping ? 'blur-[1.5px] brightness-[0.65] saturate-50' : ''
        }`}
      >
        {children}
      </div>

      {/* ── Scanlines ── */}
      {/*
        Two overlapping gradients:
          1. Horizontal lines (every 3 px) – the classic "CRT row" look
          2. Subtle colour fringing (R/G/B column offset) for chromatic feel
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background: `
            linear-gradient(
              rgba(0,0,0,0) 50%,
              rgba(0,0,0,0.30) 50%
            ),
            linear-gradient(
              90deg,
              rgba(255,0,0,0.025),
              rgba(0,255,0,0.015),
              rgba(0,0,255,0.025)
            )
          `,
          backgroundSize: '100% 3px, 4px 100%',
          mixBlendMode: 'multiply',
        }}
      />

      {/* ── Vignette ── */}
      {/*
        A pure-CSS radial vignette that darkens/dims the corners and edges,
        giving the impression of the CRT glass curvature.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          background:
            'radial-gradient(ellipse 90% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.72) 100%)',
        }}
      />

      {/* ── Phosphor edge-glow ── */}
      {/*
        A deep inset box-shadow in the phosphor green emulates light bleeding
        from the glass edges of a warm CRT tube.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 rounded"
        style={{
          boxShadow:
            'inset 0 0 60px 12px rgba(0,255,65,0.06), inset 0 0 180px 40px rgba(0,0,0,0.7)',
        }}
      />

      {/* ── Flicker ── */}
      {/*
        A semi-transparent plane that rapidly changes opacity to simulate the
        AC-driven refresh flutter of a real phosphor tube.
      */}
      <div
        aria-hidden="true"
        className="crt-flicker pointer-events-none absolute inset-0 z-40"
      />

      {/* ── Injected keyframes ── */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
          /* ── Flicker ── */
          @keyframes crt-flicker {
            0%   { opacity: 0.032; }
            8%   { opacity: 0.018; }
            16%  { opacity: 0.048; }
            24%  { opacity: 0.012; }
            32%  { opacity: 0.038; }
            40%  { opacity: 0.022; }
            48%  { opacity: 0.041; }
            56%  { opacity: 0.009; }
            64%  { opacity: 0.035; }
            72%  { opacity: 0.027; }
            80%  { opacity: 0.044; }
            88%  { opacity: 0.016; }
            96%  { opacity: 0.030; }
            100% { opacity: 0.020; }
          }
          .crt-flicker {
            background: rgba(255,255,255,1);
            animation: crt-flicker 0.12s steps(1) infinite;
          }

          /* ── Typewriter cursor blink ── */
          @keyframes crt-cursor-blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }

          /* ── EventLog entry: slide + fade in ── */
          @keyframes log-entry-in {
            from {
              opacity: 0;
              transform: translateY(10px) scaleY(0.92);
              filter: blur(2px);
            }
            to {
              opacity: 1;
              transform: translateY(0) scaleY(1);
              filter: blur(0);
            }
          }
          .log-entry-in {
            animation: log-entry-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          /* ── AlertPanel: urgent pulse for active crises ── */
          @keyframes crt-alert-pulse {
            0%, 100% { box-shadow: 0 0 4px 1px rgba(255,40,40,0.4); }
            50%       { box-shadow: 0 0 14px 4px rgba(255,40,40,0.8); }
          }
          .crt-alert-active {
            animation: crt-alert-pulse 1.4s ease-in-out infinite;
          }

          /* ── Global phosphor text glow ── */
          .crt-glow {
            text-shadow:
              0 0 4px  rgba(0,255,65,0.90),
              0 0 10px rgba(0,255,65,0.55),
              0 0 22px rgba(0,255,65,0.25);
          }
          .crt-glow-amber {
            text-shadow:
              0 0 4px  rgba(255,180,0,0.90),
              0 0 10px rgba(255,180,0,0.55),
              0 0 22px rgba(255,180,0,0.20);
          }
          .crt-glow-red {
            text-shadow:
              0 0 4px  rgba(255,50,50,0.95),
              0 0 12px rgba(255,50,50,0.60),
              0 0 24px rgba(255,50,50,0.25);
          }
        `,
        }}
      />
    </div>
  );
}
