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
    // cyber-bg: project theme helper (background noise/texture if enabled)
    // relative: establishes containing block for absolutely-positioned glow elements
    // min-h-screen: ensure container spans full viewport height
    // overflow-hidden: clip the oversized glow shapes at edges
    // bg-black text-zinc-100: dark surface with readable light text
    <div className="cyber-bg relative min-h-screen overflow-hidden bg-black text-zinc-100">
      {/* Top-left ambient glow (decorative only) */}
      {/* pointer-events-none: do not block clicks/hover on content */}
      {/* absolute + negative offsets: position the glow so only a soft edge is visible */}
      {/* aspect-square + h-112 + rounded-full: perfect circle sized via Tailwind token */}
      {/* bg-green-500/15 + blur-3xl: faint green glow with heavy blur */}
      <div className="pointer-events-none absolute -top-24 -left-20 aspect-square h-112 rounded-full bg-green-500/15 blur-3xl" />

      {/* Bottom-right ambient glow (slightly larger/stronger) */}
      <div className="pointer-events-none absolute -right-24 -bottom-32 aspect-square h-128 rounded-full bg-green-400/20 blur-3xl" />

      {/* Application content for the Wheel page (header, cards, drawers, etc.) */}
      {children}
    </div>
  );
};
