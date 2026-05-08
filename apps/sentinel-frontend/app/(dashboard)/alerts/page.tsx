'use client';

import { useState } from 'react';
import AlertTable from '@/components/dashboard/AlertTable';
import CustomDropdown from '@/components/shared/CustomDropdown';
import AlertModal from '@/components/dashboard/AlertModal';
import { Search, X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UiAlert } from '@/lib/watcher';

// Map dropdown label → watcher rule_triggered key
const RULE_FILTER_MAP: Record<string, string | undefined> = {
  'All Rules': undefined,
  'Flash Loan + Drain': 'FLASH_LOAN_DRAIN',
  'TVL Velocity Drop': 'TVL_VELOCITY',
  'Bridge Outflow Spike': 'BRIDGE_OUTFLOW_SPIKE',
};

// Map dropdown label → minimum severity number
const SEVERITY_FILTER_MAP: Record<string, number> = {
  'All Severities': 0,
  'Critical (>=90)': 90,
  'High (>=75)': 75,
  'Medium (>=60)': 60,
};

export default function AlertsPage() {
  const [ruleFilter, setRuleFilter] = useState('All Rules');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<UiAlert | null>(null);

  const rule = RULE_FILTER_MAP[ruleFilter];
  const minSeverity = SEVERITY_FILTER_MAP[severityFilter] ?? 0;

  const RulesPanelContent = () => (
    <>
      <div className="flex items-center justify-between p-6 border-b border-border-default bg-surface shrink-0 sticky top-0 z-10">
        <h3 className="font-display font-bold text-[18px] text-primary flex items-center gap-2">
          <BookOpen size={18} className="text-brand-primary" />
          Rules Reference
        </h3>
        <button 
          onClick={() => setShowRules(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-subtle text-tertiary hover:text-primary transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border-strong [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="bg-surface border border-border-strong rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase bg-brand-light text-brand-primary px-2 py-0.5 rounded border border-brand-primary/20">R1</span>
            <div className="text-[15px] font-bold text-primary">Flash Loan + Drain</div>
          </div>
          <div className="text-[13px] text-secondary leading-relaxed">
            Fires when flash loan evidence (confidence &gt; 50%) is found within the same 10-slot window as a TVL drop exceeding 20%. Score is weighted by confidence and slot distance.
          </div>
        </div>

        <div className="bg-surface border border-border-strong rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase bg-brand-light text-brand-primary px-2 py-0.5 rounded border border-brand-primary/20">R2</span>
            <div className="text-[15px] font-bold text-primary">TVL Velocity</div>
          </div>
          <div className="text-[13px] text-secondary leading-relaxed">
            Fires when TVL drops more than 20% within a 10-slot rolling window. Score scales linearly: 20% &rarr; 60, 50% &rarr; 80, 80% &rarr; 99.
          </div>
        </div>

        <div className="bg-surface border border-border-strong rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase bg-subtle text-tertiary px-2 py-0.5 rounded border border-border-default">R3</span>
            <div className="text-[15px] font-bold text-primary">Bridge Outflow Spike</div>
          </div>
          <div className="text-[13px] text-secondary leading-relaxed">
            Fires when token outflows through known Solana bridge programs exceed a configurable multiplier of the 30-slot average outflow baseline.
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-72px)] overflow-hidden relative w-full">
      {/* Main Alert History Area */}
      <div className="flex-1 flex flex-col min-w-0 p-6 sm:p-8 overflow-hidden">
        
        {/* Filters Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            
            {/* Search Bar */}
            <div className="relative flex-1 sm:flex-none sm:w-[260px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary" />
              <input 
                type="text" 
                placeholder="Search Alert ID or TX hash..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[40px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl pl-9 pr-4 text-[13px] text-primary placeholder:text-tertiary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
              />
            </div>

            <div className="hidden sm:block w-[1px] h-[24px] bg-border-default mx-1" />

            <CustomDropdown
              value={ruleFilter}
              onChange={setRuleFilter}
              options={['All Rules', 'Flash Loan + Drain', 'TVL Velocity Drop', 'Bridge Outflow Spike']}
            />
            <CustomDropdown
              value={severityFilter}
              onChange={setSeverityFilter}
              options={['All Severities', 'Critical (>=90)', 'High (>=75)', 'Medium (>=60)']}
            />
          </div>

          <button
            onClick={() => setShowRules((prev) => !prev)}
            className={`bg-surface border font-medium text-[13px] px-4 py-[9px] rounded-xl hover:bg-subtle transition-colors shadow-sm flex items-center gap-2 shrink-0 ${showRules ? 'border-brand-primary text-brand-primary' : 'border-border-default text-primary'}`}
          >
            <BookOpen size={16} className={showRules ? 'text-brand-primary' : 'text-tertiary'} />
            {showRules ? 'Hide Rules' : 'Rules Reference'}
          </button>
        </div>

        {/* Alert Table */}
        <div className="flex-1 min-h-0 relative">
          <AlertTable 
            rule={rule} 
            minSeverity={minSeverity} 
            searchTerm={searchTerm}
            onSelect={setSelectedAlert} 
          />
        </div>
      </div>

      {/* Rules Reference - Desktop (Split Layout) */}
      <AnimatePresence>
        {showRules && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="hidden lg:block shrink-0 border-l border-border-default bg-surface relative z-20 overflow-hidden shadow-sm"
          >
            <div className="w-[340px] h-full flex flex-col">
              <RulesPanelContent />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Reference - Mobile/Tablet (Overlay Layout) */}
      <AnimatePresence>
        {showRules && (
          <>
            {/* Subtle dim overlay without heavy blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden absolute inset-0 bg-[#0f172a]/32 backdrop-blur-[2px] z-30"
              onClick={() => setShowRules(false)}
            />

            {/* Mobile/Tablet Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden absolute top-0 right-0 h-full w-full sm:w-[360px] bg-surface border-l border-border-default z-40 flex flex-col shadow-2xl"
            >
              <RulesPanelContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </div>
  );
}
