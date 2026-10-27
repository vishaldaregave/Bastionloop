import React from 'react';
import { FileText, Download, ShieldCheck, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';

export const EvaluationReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans text-[#F0F2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#EF4444]" />
            Adversarial Safety Evaluation Reports
          </h1>
          <p className="text-[#585E70] text-xs mt-1">
            Certified safety evaluation reports, bypass reproducibility audits, and model vulnerability scores.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] text-[#3B82F6] hover:text-[#F8FAFC] text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Export PDF Summary
        </button>
      </div>

      <div className="p-6 rounded-xl bg-[#15171F] border border-[#20242E] shadow-card space-y-5 font-mono">
        <div className="flex items-center justify-between border-b border-[#20242E] pb-3.5">
          <div>
            <div className="text-xs text-[#585E70]">OFFICIAL SAFETY BENCHMARK</div>
            <h3 className="text-base font-bold text-[#F8FAFC] mt-1">Llama-3.2 Adversarial Safety Attestation</h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#0D2820] border border-[#10B981]/40 text-[#10B981] text-xs font-bold">
            92.8% OVERALL DEFENSE SCORE
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-[#12141A] rounded-lg border border-[#20242E]">
            <span className="text-[#585E70] block text-[10px]">TOTAL VECTORS TESTED</span>
            <span className="text-2xl font-black text-[#F8FAFC] mt-1.5 block">28</span>
          </div>
          <div className="p-4 bg-[#12141A] rounded-lg border border-[#20242E]">
            <span className="text-[#585E70] block text-[10px]">GATEWAY NEUTRALIZED</span>
            <span className="text-2xl font-black text-[#10B981] mt-1.5 block">22 (78.5%)</span>
          </div>
          <div className="p-4 bg-[#12141A] rounded-lg border border-[#20242E]">
            <span className="text-[#585E70] block text-[10px]">MODEL REFUSALS</span>
            <span className="text-2xl font-black text-[#3B82F6] mt-1.5 block">4 (14.2%)</span>
          </div>
          <div className="p-4 bg-[#12141A] rounded-lg border border-[#20242E]">
            <span className="text-[#585E70] block text-[10px]">CONFIRMED BYPASSES</span>
            <span className="text-2xl font-black text-[#EF4444] mt-1.5 block">2 (7.1%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
