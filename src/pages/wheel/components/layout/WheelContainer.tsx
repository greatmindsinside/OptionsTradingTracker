import React from 'react';

/**
 * WheelContainer
 * Layout wrapper for the Wheel strategy experience.
 *
 * Responsibilities
 * - Sets the global dark theme surface for the page (black background, light text).
 * - Renders two large blurred "glow" shapes for ambient lighting.
 * - Ensures the page always fills the viewport height and hides overflow from the glows.
 *
 * Usage
 * - WheelPage composes its screen as:
 *     <WheelContainer>
 *       <WheelHeader />
 *       [page content: cards, drawers, tables, etc.]
 *     </WheelContainer>
 * - The visual glows are purely decorative and do not intercept pointer events.
 */
export const WheelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    // Gold Spine Grid: deep charcoal base with gold circuit edges
    // relative: establishes containing block for absolutely-positioned elements
    // min-h-screen: ensure container spans full viewport height
    // overflow-hidden: clip effects at edges
    // text-zinc-100: readable light text
    <div
      className="relative min-h-screen overflow-hidden text-zinc-100"
      style={{ backgroundColor: '#0B0F0E' }}
    >
      {/* Base background image layer - goldcitypng.png */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'url(/goldcitypng.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1,
        }}
      />

      {/* Gold Spine Grid CSS overlay - emerald/magenta/gold gradients + grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(60% 40% at 50% 120%, rgba(0,227,159,.18), transparent 60%),
            radial-gradient(40% 30% at 100% 0%, rgba(195,0,255,.10), transparent 60%),
            linear-gradient(to bottom, rgba(245,179,66,.25), transparent 12%),
            linear-gradient(to top, rgba(245,179,66,.25), transparent 12%),
            repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0px, transparent 1px, transparent 24px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0px, transparent 1px, transparent 24px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 12%, 100% 12%, 24px 24px, 24px 24px',
          backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat, repeat, repeat',
          zIndex: 2,
        }}
      />

      {/* Subtle starfield layer - reduced opacity to keep center clean */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(0.5px 0.5px at 15% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(0.5px 0.5px at 85% 15%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
            radial-gradient(0.5px 0.5px at 45% 75%, rgba(255, 255, 255, 0.06) 0%, transparent 50%),
            radial-gradient(0.5px 0.5px at 65% 45%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(0.5px 0.5px at 25% 55%, rgba(255, 255, 255, 0.06) 0%, transparent 50%),
            radial-gradient(0.5px 0.5px at 75% 85%, rgba(255, 255, 255, 0.08) 0%, transparent 50%)
          `,
          backgroundSize:
            '800px 800px, 900px 900px, 700px 700px, 850px 850px, 750px 750px, 950px 950px',
          backgroundPosition: '0% 0%, 100% 0%, 50% 50%, 0% 100%, 100% 100%, 25% 75%',
          animation: 'starfield-drift 120s linear infinite',
          opacity: 0.4,
          zIndex: 3,
        }}
      />

      {/* Emerald nebula accents - reduced to blend with Gold Spine design */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 aspect-square h-128 animate-pulse rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, rgba(34, 197, 94, 0.02) 50%, transparent 70%)',
          filter: 'blur(80px)',
          animationDuration: '8s',
          opacity: 0.6,
          zIndex: 4,
        }}
      />

      <div
        className="pointer-events-none absolute -right-32 -bottom-40 aspect-square h-144 animate-pulse rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(34, 197, 94, 0.03) 0%, rgba(16, 185, 129, 0.015) 50%, transparent 70%)',
          filter: 'blur(100px)',
          animationDuration: '10s',
          animationDelay: '2s',
          opacity: 0.6,
          zIndex: 4,
        }}
      />

      {/* Content layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
