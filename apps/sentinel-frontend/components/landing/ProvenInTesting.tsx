'use client';

import { Check } from 'lucide-react';
import ExplorerLink from '../shared/ExplorerLink';
import { motion, Variants } from 'framer-motion';

const SCENARIOS = [
  { id: 1, type: "Normal deposits + 3.3% withdrawal", expected: "No alert", result: "Silent", tx: null },
  { id: 2, type: "Rapid 81% drain in 3 transactions", expected: "TVL_VELOCITY", result: "Severity 99, <3s", tx: "3BtKhbumvRwPhDaAbhGiRPbA3iWGfbMH66Fsu8SkrSHDPx7gmau6vet8cMccbzAKuEttMMBXXNkhNg4QSo423kHQ" },
  { id: 3, type: "Flash loan + 40% drain exploit", expected: "FLASH_LOAN_DRAIN", result: "Severity 64, <5s", tx: "2QdTiQKEgBaF53Hk29ek75eo6mnaD3Cfv2fTimcUtMeDN48gbqwoLi9PsZ7Wa1nekoMoVZaajN9RQbkTMvwjNeDo" },
  { id: 4, type: "10% single drain (below threshold)", expected: "No alert", result: "Silent", tx: null },
  { id: 5, type: "Slow 5%×8 cumulative bleed", expected: "TVL_VELOCITY", result: "Fires at slice 5", tx: "cooldown" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function ProvenInTesting() {
  return (
    <section className="py-24 bg-[#eef1f8] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-14 max-w-2xl relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-[#d6e1f6] shadow-sm mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>
            <span className="text-[#1e40af] text-[12px] font-semibold tracking-[0.08em] uppercase">
              Battle Tested
            </span>
          </div>
          <h2 className="font-display font-bold text-[40px] leading-[1.15] text-[#0f172a] tracking-tight mb-5">
            5 attack scenarios. <br />
            <span className="text-[#2563eb]">All detected instantly.</span>
          </h2>
          <p className="text-[17px] leading-[1.65] text-[#475569] max-w-xl">
            See how SentinelGuard&apos;s engine performs against real-world smart contract exploits and flash loan attacks with mathematically proven sub-second precision.
          </p>
        </motion.div>

        <div className="relative">
          {/* Glassmorphic Container */}
          <div className="relative rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(243,247,255,0.84))] p-3 md:p-6 shadow-[0_20px_56px_rgba(15,23,42,0.08)] backdrop-blur-sm overflow-x-auto custom-scrollbar">
            
            <div className="min-w-[900px]">
              {/* Header */}
              <div className="grid grid-cols-[60px_1.6fr_0.9fr_1.2fr_1.2fr] gap-4 px-6 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#64748b]">
                <div>#</div>
                <div>Attack Type</div>
                <div>Expected</div>
                <div>Live Result</div>
                <div>On-chain Action</div>
              </div>

              {/* Rows */}
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="flex flex-col gap-1"
              >
                {SCENARIOS.map((row) => {
                  const isSilent = row.result === "Silent";

                  return (
                    <motion.div 
                      key={row.id} 
                      variants={itemVariants}
                      className="group relative grid grid-cols-[60px_1.6fr_0.9fr_1.2fr_1.2fr] gap-4 px-6 py-4 items-center rounded-[16px] hover:bg-white hover:shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all duration-300 border border-transparent hover:border-white/60 cursor-default overflow-hidden"
                    >
                      {/* Left Accent Bar */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] bg-[#2563eb] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Data Elements with Hover Translation */}
                      <div className="text-[13px] font-mono text-[#94a3b8] group-hover:translate-x-1 transition-transform duration-300">
                        0{row.id}
                      </div>
                      
                      <div className="text-[15px] font-medium text-[#0f172a] group-hover:translate-x-1 transition-transform duration-300 delay-[20ms]">
                        {row.type}
                      </div>
                      
                      <div className="group-hover:translate-x-1 transition-transform duration-300 delay-[40ms]">
                        <span className="inline-block px-2.5 py-1 rounded-[6px] bg-white/70 border border-[#e2e8f0] font-mono text-[12px] font-medium text-[#475569] shadow-sm">
                          {row.expected}
                        </span>
                      </div>
                      
                      <div className="group-hover:translate-x-1 transition-transform duration-300 delay-[60ms]">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                          isSilent 
                            ? "bg-[#f1f5f9] text-[#64748b] border border-transparent" 
                            : "bg-[#eef4ff] text-[#1e40af] border border-[#d6e1f6] shadow-sm"
                        }`}>
                          {!isSilent && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563eb] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563eb]"></span>
                            </span>
                          )}
                          {isSilent && <Check size={14} className="text-[#94a3b8]" />}
                          {row.result}
                        </span>
                      </div>
                      
                      <div className="group-hover:translate-x-1 transition-transform duration-300 delay-[80ms]">
                        {row.tx === 'cooldown' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f8fafc] text-[#64748b] text-[13px] font-medium border border-[#e2e8f0]">
                            Cooldown Active
                          </span>
                        ) : row.tx ? (
                          <ExplorerLink signature={row.tx} />
                        ) : (
                          <span className="text-[#94a3b8] text-[14px]">N/A</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
