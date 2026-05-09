'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Calendar } from 'lucide-react';
import CustomDropdown from '@/components/shared/CustomDropdown';
import { MOCK_PROTOCOL_ID } from '@/lib/constants';

const StatsRow = dynamic(() => import('@/components/dashboard/StatsRow'), {
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-surface border border-border-default rounded-[12px] p-[20px_24px] shadow-sm animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-[40px] h-[40px] rounded-[10px] bg-border-default/50" />
            <div className="h-4 w-28 rounded bg-border-default/50" />
          </div>
          <div className="h-9 w-16 rounded bg-border-default/50 mb-2" />
          <div className="h-4 w-24 rounded bg-border-default/40" />
        </div>
      ))}
    </div>
  ),
});

const TVLChart = dynamic(() => import('@/components/dashboard/TVLChart'), {
  loading: () => <div className="bg-surface border border-border-default rounded-[12px] h-[360px] animate-pulse" />,
});

const AlertFeed = dynamic(() => import('@/components/dashboard/AlertFeed'), {
  loading: () => <div className="bg-surface border border-border-default rounded-[12px] h-[360px] animate-pulse" />,
});

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState('Last 24 Hours');

  return (
    <div className="flex flex-col">
      <div className="flex justify-end mb-6">
        <CustomDropdown
          value={timeRange}
          onChange={setTimeRange}
          options={['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'All Time']}
          icon={<Calendar size={14} className="text-secondary" />}
        />
      </div>

      <StatsRow />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 mt-6 items-start">
        <TVLChart protocol={MOCK_PROTOCOL_ID} />
        <AlertFeed />
      </div>
    </div>
  );
}
