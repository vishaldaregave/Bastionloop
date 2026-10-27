import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Award } from 'lucide-react';
import { TrustScoreBreakdown } from '../types';

interface TrustMeterProps {
  score: number;
  tier: string;
  breakdown?: TrustScoreBreakdown;
  size?: 'sm' | 'md' | 'lg';
}

export const TrustMeter: React.FC<TrustMeterProps> = ({ score, tier, breakdown, size = 'md' }) => {
  let colorClass = 'text-emerald-800 border-emerald-300 bg-emerald-50';
  let barColor = 'bg-emerald-500';
  let Icon = ShieldCheck;

  if (score < 60) {
    colorClass = 'text-red-800 border-red-300 bg-red-50';
    barColor = 'bg-red-500';
    Icon = ShieldAlert;
  } else if (score < 80) {
    colorClass = 'text-amber-800 border-amber-300 bg-amber-50';
    barColor = 'bg-amber-500';
    Icon = AlertTriangle;
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
            BASTIONLOOP TRUST METRIC
          </span>
          <h3 className="text-sm font-bold text-slate-900 font-mono">TEST INTEGRITY SCORE</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${colorClass}`}>
          {tier}
        </span>
      </div>

      <div className="flex items-center gap-6 my-3">
        {/* Large Score Display */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-mono font-extrabold text-slate-900">{score}</span>
          <span className="text-sm font-mono text-slate-500">/100</span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="flex-1">
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full ${barColor} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>0 (HIGH RISK)</span>
            <span>60 (REVIEW)</span>
            <span>80 (TRUSTED)</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Breakdown Dimensions */}
      {breakdown && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-semibold">ISOLATION (25%)</div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{breakdown.isolation_score}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-semibold">EVIDENCE (20%)</div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{breakdown.evidence_score}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-semibold">CONTAMINATION (20%)</div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{breakdown.contamination_score}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-semibold">FAIRNESS (15%)</div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{breakdown.fairness_score}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-semibold">ACCESS RBAC (10%)</div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{breakdown.access_score}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-semibold">AUDIT (10%)</div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{breakdown.observability_score}%</div>
          </div>
        </div>
      )}
    </div>
  );
};
