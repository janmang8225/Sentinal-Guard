'use client';

import { useState, useEffect } from 'react';
import StatsRow from '@/components/dashboard/StatsRow';
import TVLChart from '@/components/dashboard/TVLChart';
import AlertFeed from '@/components/dashboard/AlertFeed';
import { Calendar } from 'lucide-react';
import CustomDropdown from '@/components/shared/CustomDropdown';
import { MOCK_PROTOCOL_ID } from '@/lib/constants';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Last 24 Hours');

  useEffect(() => {
    // Simulate initial data fetching
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Date Range Picker Control */}
      <div className="flex justify-end mb-6">
        <CustomDropdown 
          value={timeRange} 
          onChange={setTimeRange} 
          options={['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'All Time']} 
          icon={<Calendar size={14} className="text-secondary" />}
        />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {/* Skeleton Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[24px]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface border border-border-default rounded-[16px] p-[24px] h-[120px] animate-pulse">
                <div className="w-24 h-4 bg-border-default rounded mb-4"></div>
                <div className="w-16 h-8 bg-border-default rounded"></div>
              </div>
            ))}
          </div>
          
          {/* Skeleton Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
            <div className="bg-surface border border-border-default rounded-[16px] h-[400px] animate-pulse p-6">
              <div className="w-32 h-6 bg-border-default rounded mb-8"></div>
              <div className="w-full h-[280px] bg-subtle rounded"></div>
            </div>
            <div className="bg-surface border border-border-default rounded-[16px] h-[400px] animate-pulse p-6">
              <div className="w-24 h-6 bg-border-default rounded mb-6"></div>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-full h-16 bg-subtle rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <StatsRow />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 mt-6 items-start">
            <TVLChart protocol={MOCK_PROTOCOL_ID} />
            <AlertFeed />
          </div>
        </>
      )}
    </div>
  );
}
