'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Brush,
} from 'recharts';
import type { UiAlert, WatcherStats } from '@/lib/watcher';
import { formatUSD, getRuleTitle } from '@/lib/utils';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] p-3 shadow-[var(--shadow-md)] flex flex-col gap-1 min-w-[140px]">
        <p className="text-[12px] font-medium text-[var(--text-tertiary)]">{label}</p>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[var(--text-secondary)]">Severity</span>
          <span className="text-[14px] font-mono font-bold text-[var(--brand-primary)]">{payload[0].value}/99</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] p-3 shadow-[var(--shadow-md)] flex flex-col gap-1 min-w-[140px]">
        <p className="text-[12px] font-medium text-[var(--text-tertiary)]">Severity {label}</p>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[var(--text-secondary)]">Alerts</span>
          <span className="text-[14px] font-bold text-[var(--brand-primary)]">{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

const PIE_COLORS = ['var(--brand-primary)', 'var(--brand-light)', 'var(--border-strong)'];

export default function AnalyticsContent({
  alerts,
  stats,
}: {
  alerts: UiAlert[];
  stats: WatcherStats | null;
}) {
  const avgResponseTimeMs = Number(stats?.avg_response_time_ms ?? 0).toFixed(0);
  const totalAtRisk = alerts.reduce((s, a) => s + a.at_risk_amount, 0);
  const avgSeverity = alerts.length ? Math.round(alerts.reduce((s, a) => s + a.severity, 0) / alerts.length) : 0;
  const pauseCount = alerts.filter((a) => a.status === 'PAUSED').length;

  const ruleDistribution = alerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.rule_triggered] = (acc[a.rule_triggered] || 0) + 1;
    return acc;
  }, {});

  const alertPieData = Object.entries(ruleDistribution).map(([name, value], i) => ({
    name: getRuleTitle(name),
    value,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const distributionData = [
    { name: '0-29', value: alerts.filter((a) => a.severity < 30).length, fill: 'var(--bg-inset)' },
    { name: '30-59', value: alerts.filter((a) => a.severity >= 30 && a.severity < 60).length, fill: 'var(--border-default)' },
    { name: '60-74', value: alerts.filter((a) => a.severity >= 60 && a.severity < 75).length, fill: 'var(--bg-inset)' },
    { name: '75-89', value: alerts.filter((a) => a.severity >= 75 && a.severity < 90).length, fill: 'var(--brand-primary)' },
    { name: '90-99', value: alerts.filter((a) => a.severity >= 90).length, fill: 'var(--severity-critical-dot)' },
  ];

  const severityData: Array<{ time: string; severity: number; isAlert?: boolean; rule?: string }> = [];
  [...alerts].reverse().forEach((a) => {
    const time = new Date(a.created_at);
    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    severityData.push({ time: timeStr, severity: 0 });
    severityData.push({ time: timeStr, severity: a.severity, isAlert: true, rule: a.rule_triggered });
    severityData.push({ time: timeStr, severity: Math.round(a.severity * 0.8) });
    const recoveryStr = new Date(time.getTime() + 10000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    severityData.push({ time: recoveryStr, severity: 0 });
  });

  return (
    <div className="flex flex-col space-y-[24px] pt-2 pb-10">
      <div className="grid grid-cols-6 gap-[16px]">
        <div className="bg-surface border border-border-default rounded-[12px] p-[20px] shadow-[var(--shadow-sm)]">
          <div className="text-[12px] font-medium text-secondary mb-2">Total Alerts</div>
          <div className="text-[28px] font-display font-bold text-primary leading-none mb-2">{alerts.length}</div>
          <div className="text-[12px] text-secondary">All time</div>
        </div>
        <div className="bg-surface border border-border-default rounded-[12px] p-[20px] shadow-[var(--shadow-sm)]">
          <div className="text-[12px] font-medium text-secondary mb-2">Total At-Risk</div>
          <div className="text-[28px] font-display font-bold text-primary leading-none mb-2">{formatUSD(totalAtRisk)}</div>
          <div className="text-[12px] text-secondary">USDC equivalent</div>
        </div>
        <div className="bg-surface border border-border-default rounded-[12px] p-[20px] shadow-[var(--shadow-sm)]">
          <div className="text-[12px] font-medium text-secondary mb-2">Avg Severity</div>
          <div className="text-[28px] font-display font-bold text-primary leading-none mb-2">{avgSeverity}/99</div>
          <div className="text-[12px] text-secondary">Across all alerts</div>
        </div>
        <div className="bg-surface border border-border-default rounded-[12px] p-[20px] shadow-[var(--shadow-sm)]">
          <div className="text-[12px] font-medium text-secondary mb-2">Avg Response</div>
          <div className="text-[28px] font-display font-bold text-primary leading-none mb-2">{`${avgResponseTimeMs}ms`}</div>
          <div className="text-[12px] text-secondary">Detection &rarr; Pause</div>
        </div>
        <div className="bg-surface border border-border-default rounded-[12px] p-[20px] shadow-[var(--shadow-sm)]">
          <div className="text-[12px] font-medium text-secondary mb-2">Pause Rate</div>
          <div className="text-[28px] font-display font-bold text-primary leading-none mb-2">{alerts.length ? Math.round((pauseCount / alerts.length) * 100) : 0}%</div>
          <div className="text-[12px] text-secondary">{pauseCount} pauses executed</div>
        </div>
        <div className="bg-surface border border-border-default rounded-[12px] p-[20px] shadow-[var(--shadow-sm)]">
          <div className="text-[12px] font-medium text-secondary mb-2">Rule Types</div>
          <div className="text-[28px] font-display font-bold text-primary leading-none mb-2">{Object.keys(ruleDistribution).length}</div>
          <div className="text-[12px] text-secondary">Active detection rules</div>
        </div>
      </div>

      <div className="flex gap-[24px]">
        <div className="flex-1 min-w-0 bg-surface border border-border-default rounded-[12px] p-[24px] shadow-[var(--shadow-sm)]">
          <h3 className="font-display font-bold text-[16px] text-primary mb-1">Severity Over Time</h3>
          <p className="text-[13px] text-secondary mb-6">Per-alert severity scores across detection events. Use the brush below to zoom into specific timeframes.</p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSeverity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" opacity={0.5} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} dy={10} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'var(--brand-primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="severity"
                  stroke="var(--brand-primary)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSeverity)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--brand-primary)', style: { filter: 'drop-shadow(0 0 6px var(--brand-primary))' } }}
                />
                <Brush
                  dataKey="time"
                  height={30}
                  stroke="var(--border-strong)"
                  fill="var(--bg-base)"
                  tickFormatter={() => ''}
                  travellerWidth={10}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="w-[320px] shrink-0 bg-surface border border-border-default rounded-[12px] p-[24px] shadow-[var(--shadow-sm)] flex flex-col">
          <h3 className="font-display font-bold text-[16px] text-primary mb-1">Alert Distribution</h3>
          <p className="text-[13px] text-secondary mb-2">Alerts by detection rule type</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[180px] w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {alertPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2">
              {alertPieData.map((d) => (
                <div key={d.name} className="flex justify-between items-center text-[12px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-semibold text-primary">{d.name}</span>
                  </div>
                  <span className="text-secondary">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border-default rounded-[12px] p-[24px] shadow-[var(--shadow-sm)]">
        <h3 className="font-display font-bold text-[16px] text-primary mb-1">Severity Distribution</h3>
        <p className="text-[13px] text-secondary mb-6">Number of alerts per severity bucket</p>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }} barSize={120}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" opacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomBarTooltip />} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface border border-border-default rounded-[12px] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-[24px] border-b border-border-default">
          <h3 className="font-display font-bold text-[16px] text-primary mb-1">Rule Performance Summary</h3>
          <p className="text-[13px] text-secondary">Per-rule analytics breakdown</p>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--bg-base)]">
              <th className="py-3 px-6 text-[11px] font-bold tracking-wider text-tertiary uppercase">Rule</th>
              <th className="py-3 px-6 text-[11px] font-bold tracking-wider text-tertiary uppercase">Alerts</th>
              <th className="py-3 px-6 text-[11px] font-bold tracking-wider text-tertiary uppercase">Avg Severity</th>
              <th className="py-3 px-6 text-[11px] font-bold tracking-wider text-tertiary uppercase">Total At Risk</th>
              <th className="py-3 px-6 text-[11px] font-bold tracking-wider text-tertiary uppercase">Pause Rate</th>
              <th className="py-3 px-6 text-[11px] font-bold tracking-wider text-tertiary uppercase">Avg Response</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {Object.entries(ruleDistribution).map(([rule, count]) => {
              const ruleAlerts = alerts.filter((a) => a.rule_triggered === rule);
              const ruleAvgSev = Math.round(ruleAlerts.reduce((s, a) => s + a.severity, 0) / ruleAlerts.length);
              const ruleTotalRisk = ruleAlerts.reduce((s, a) => s + a.at_risk_amount, 0);
              const rulePauses = ruleAlerts.filter((a) => a.status === 'PAUSED').length;
              const ruleAvgResp = Number(stats?.avg_response_time_ms ?? 0).toFixed(0);

              return (
                <tr key={rule} className="border-b border-border-default">
                  <td className="py-4 px-6">
                    <span className="bg-surface border border-border-default rounded-md px-2.5 py-1 font-medium text-primary shadow-sm">{getRuleTitle(rule)}</span>
                  </td>
                  <td className="py-4 px-6 font-bold text-primary">{count}</td>
                  <td className="py-4 px-6 font-medium text-severity-high-text">{ruleAvgSev}/99</td>
                  <td className="py-4 px-6 font-bold text-status-paused">{formatUSD(ruleTotalRisk)}</td>
                  <td className="py-4 px-6 font-medium text-status-active">{Math.round((rulePauses / ruleAlerts.length) * 100)}%</td>
                  <td className="py-4 px-6 text-secondary">{`${ruleAvgResp}ms`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
