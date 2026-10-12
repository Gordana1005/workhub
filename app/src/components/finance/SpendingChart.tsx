'use client';

import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from '@/components/tools/chart';

export type SpendingSlice = {
  key: string;
  name: string;
  value: number;
  color: string;
}

/**
 * Donut for spending by category. Lives in its own module so recharts is only fetched when a chart is shown
 * (the finance page loads it with next/dynamic). The wrapper has a fixed size, so the container is never
 * measured at 0 and Recharts does not log width(-1) warnings.
 */
export default function SpendingChart({
  slices,
  formatValue,
  centerLabel,
  centerValue,
}: {
  slices: SpendingSlice[];
  formatValue: (value: number) => string;
  centerLabel: string;
  centerValue: string;
}) {
  return (
    <div className="relative mx-auto h-44 w-44 min-w-0 max-w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 176, height: 176 }}>
        <RePieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
        </RePieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-text-secondary">{centerLabel}</span>
        <span className="max-w-[6.5rem] truncate text-sm font-semibold tabular-nums text-text-primary">{centerValue}</span>
      </div>
    </div>
  );
}
