import { Icon } from '@iconify/react';

import { useWheelMetrics } from '@/pages/wheel/hooks/useWheelMetrics';

import { MetricCard } from './MetricCard';

export function SummaryMetrics() {
  const { premiumThisWeek, capitalInPuts, sharesForCalls } = useWheelMetrics();

  return (
    <div className="grid grid-cols-3 gap-3">
      <MetricCard
        label="Premium This Week"
        icon={<Icon icon="ri:money-dollar-circle-fill" className="h-4 w-4" />}
        value={Math.abs(premiumThisWeek)}
        subtitle="Net option cash flow"
        testId="premium-this-week-value"
        format="currency"
      />
      <MetricCard
        label="Capital In Puts"
        icon={<Icon icon="fluent:chart-multiple-24-filled" className="h-4 w-4" />}
        value={capitalInPuts}
        subtitle="Open short puts collateral"
        testId="capital-in-puts-value"
        format="currency"
      />
      <MetricCard
        label="Shares For Calls"
        icon={<Icon icon="fluent:shield-task-24-filled" className="h-4 w-4" />}
        value={sharesForCalls.covered}
        subtitle={`${sharesForCalls.cnt} symbols`}
        testId="shares-for-calls-value"
        format="number"
      />
    </div>
  );
}
