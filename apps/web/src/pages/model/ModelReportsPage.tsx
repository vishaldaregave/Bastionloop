import React, { useState } from 'react';
import {
  FileText, Download, ShieldCheck, AlertTriangle, CheckCircle2,
  Calendar, Award, Hash, ArrowUpRight, BarChart3, PieChart, Sparkles
} from 'lucide-react';

interface ModelReportsPageProps {
  evaluationId?: string;
}

export const ModelReportsPage: React.FC<ModelReportsPageProps> = ({ evaluationId }) => {
  const [reports] = useState([
    {
      id: 'REP-LLM-2026-001',
      title: 'Phase 1 Target LLM Adversarial Robustness Assessment',
      evaluationId: evaluationId || 'BL-2026-00001',
      targetModel: 'llama3.2:latest',
      generatedAt: '2026-10-10 16:45:00',
      totalProbes: 48,
      blockedProbes: 44,
      filteredProbes: 3,
      bypassedProbes: 1,
      safetyScore: '94.2%',
      status: 'AUDITED & SIGNED'
    },
    {
      id: 'REP-LLM-2026-002',
      title: 'Canary Isolation & Memory Leakage Verification',
      evaluationId: 'BL-2026-00002',
      targetModel: 'llama3.2:latest',
      generatedAt: '2026-10-09 11:20:00',
      totalProbes: 20,
      blockedProbes: 20,
      filteredProbes: 0,
      bypassedProbes: 0,
      safetyScore: '100.0%',
      status: 'CLEAN (NO LEAKS)'
    }
  ]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6366F1]" />
            Evaluation Reports & Audits
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Certified safety evaluation reports, bypass reproducibility audits, and model vulnerability scores.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="bg-[#15171F] rounded-xl border border-[#20242E] hover:border-[#6366F1]/50 shadow-card p-6 space-y-5 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#3B82F6] bg-[#12141A] px-2.5 py-0.5 rounded border border-[#20242E]">
                  {rep.id}
                </span>
                <h3 className="font-bold text-[#F8FAFC] text-base font-mono mt-2">{rep.title}</h3>
              </div>
              <span className="px-3 py-1 text-xs font-bold font-mono bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 rounded-full">
                {rep.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-4 bg-[#12141A] rounded-xl border border-[#20242E] text-center">
                <span className="text-[11px] font-mono text-[#585E70] block uppercase tracking-wider">Probes</span>
                <span className="font-bold text-[#F8FAFC] font-mono text-lg mt-1 block">{rep.totalProbes}</span>
              </div>
              <div className="p-4 bg-[#12141A] rounded-xl border border-[#20242E] text-center">
                <span className="text-[11px] font-mono text-[#585E70] block uppercase tracking-wider">Defended</span>
                <span className="font-bold text-[#10B981] font-mono text-lg mt-1 block">{rep.blockedProbes + rep.filteredProbes}</span>
              </div>
              <div className="p-4 bg-[#12141A] rounded-xl border border-[#20242E] text-center">
                <span className="text-[11px] font-mono text-[#585E70] block uppercase tracking-wider">Safety Score</span>
                <span className="font-bold text-[#6366F1] font-mono text-lg mt-1 block">{rep.safetyScore}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#20242E] flex items-center justify-between text-xs font-mono text-[#585E70]">
              <span>Model: <span className="text-[#F8FAFC] font-bold">{rep.targetModel}</span></span>
              <span>{rep.generatedAt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
