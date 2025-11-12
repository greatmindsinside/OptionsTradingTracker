import type { WheelPhase } from '@/types/wheel';

/**
 * Phase descriptions for tooltips
 * Explains what each wheel phase means and what happens next
 */
export const PHASE_DESCRIPTIONS: Record<WheelPhase, string> = {
  'Sell Cash Secured Puts':
    "No positions yet. Start the wheel by selling cash-secured puts to collect premium. If assigned, you'll buy shares at the strike price.",
  'Call Expires Worthless':
    "You have shares with covered calls open. Waiting for calls to expire worthless so you keep the shares and premium, then you can sell another covered call.",
  'Sell Covered Calls':
    'You have shares but no covered calls. Sell covered calls to generate income on your shares.',
  'Put Expires Worthless':
    'Your put expired worthless. You kept the premium. Sell another cash-secured put to continue the wheel.',
  'Buy At Strike':
    "Put was assigned. You now own shares at the strike price. Sell covered calls to continue the wheel.",
  'Call Exercised Sell Shares':
    "Call was exercised. Your shares were sold at the strike price. Start the wheel again by selling cash-secured puts.",
  'Repeat':
    'Continue the wheel cycle by selling another cash-secured put or covered call.',
};

