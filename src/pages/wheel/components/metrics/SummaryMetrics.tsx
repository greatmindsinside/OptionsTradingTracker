import { MetricCard } from './MetricCard';
import { useWheelMetrics } from '@/pages/wheel/hooks/useWheelMetrics';

export function SummaryMetrics() {
  const { premiumThisWeek, capitalInPuts, sharesForCalls } = useWheelMetrics();

  return (
    <div className="grid grid-cols-3 gap-3">
      <MetricCard
        label="💰 Premium This Week"
        value={Math.abs(premiumThisWeek)}
        subtitle="Net option cash flow"
        testId="premium-this-week-value"
        format="currency"
      />
      <MetricCard
        label="🏦 Capital In Puts"
        value={capitalInPuts}
        subtitle="Open short puts collateral"
        testId="capital-in-puts-value"
        format="currency"
      />
      <MetricCard
        label="🛡️ Shares For Calls"
        value={sharesForCalls.covered}
        subtitle={`${sharesForCalls.cnt} symbols`}
        testId="shares-for-calls-value"
        format="number"
      />
    </div>
  );
}
