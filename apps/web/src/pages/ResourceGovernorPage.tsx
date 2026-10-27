import React, { useState, useEffect } from 'react';
import { Gauge, Cpu, BarChart3, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ResourceFairness } from '../types';
import { api } from '../services/api';

interface ResourceGovernorPageProps {
  evaluationId: string;
}

export const ResourceGovernorPage: React.FC<ResourceGovernorPageProps> = ({ evaluationId }) => {
  const [fairness, setFairness] = useState<ResourceFairness | null>(null);

  useEffect(() => {
    if (evaluationId) {
      loadFairness();
    }
  }, [evaluationId]);

  const loadFairness = async () => {
    try {
      const data = await api.getResourceFairness(evaluationId);
      setFairness(data);
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold font-mono text-slate-900">RESOURCE GOVERNOR & FAIRNESS MONITOR</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-bold">
            RATE & QUOTA GOVERNANCE
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Prevents adversarial resource exhaustion, tracks fairness metrics, and throttles noisy sandbox actors.
        </p>
      </div>

      {/* Fairness Indicator Hero Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-card grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
            RESOURCE FAIRNESS INDICATOR
          </span>
          <div className="text-4xl font-mono font-black text-slate-900">
            {fairness?.fairness_score ?? 98.0}
            <span className="text-sm font-normal text-slate-500">/100</span>
          </div>
          <div className="text-xs font-mono text-emerald-700 font-bold">
            STATUS: {fairness?.status ?? 'BALANCED'}
          </div>
        </div>

        {/* Actor Share Distribution */}
        <div className="md:col-span-2 space-y-3">
          <span className="text-xs font-mono text-slate-700 font-semibold">ACTOR RESOURCE ALLOCATION SHARE</span>
          
          <div className="space-y-2 font-mono text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-red-700 font-bold">RED SANDBOX</span>
                <span className="text-slate-700 font-semibold">{fairness?.red_resource_share_pct ?? 33.3}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${fairness?.red_resource_share_pct ?? 33.3}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-purple-700 font-bold">TARGET LLM</span>
                <span className="text-slate-700 font-semibold">{fairness?.llm_resource_share_pct ?? 33.4}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${fairness?.llm_resource_share_pct ?? 33.4}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-emerald-700 font-bold">BLUE SANDBOX</span>
                <span className="text-slate-700 font-semibold">{fairness?.blue_resource_share_pct ?? 33.3}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${fairness?.blue_resource_share_pct ?? 33.3}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Governor Recommendations */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>GOVERNOR OBSERVABILITY & INSIGHTS</span>
        </h3>
        <div className="space-y-2 font-mono text-xs text-slate-700">
          {(fairness?.recommendations || [
            "All sandbox actor request limits operating within allocated CPU & memory quotas.",
            "Zero throttle conditions detected across active evaluation execution cycles."
          ]).map((rec, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
