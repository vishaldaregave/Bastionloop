import React, { useState, useEffect } from 'react';
import { Bug, Play, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Lock } from 'lucide-react';
import { ContaminationCheck } from '../types';
import { api } from '../services/api';

interface ContaminationPageProps {
  evaluationId: string;
}

export const ContaminationPage: React.FC<ContaminationPageProps> = ({ evaluationId }) => {
  const [checks, setChecks] = useState<ContaminationCheck[]>([]);
  const [customProbe, setCustomProbe] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<ContaminationCheck | null>(null);

  useEffect(() => {
    if (evaluationId) {
      loadChecks();
    }
  }, [evaluationId]);

  const loadChecks = async () => {
    try {
      const data = await api.listContaminationChecks(evaluationId);
      setChecks(data);
      if (data.length > 0) setLastCheck(data[0]);
    } catch (e) {}
  };

  const handleRunCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    try {
      const res = await api.runContaminationCheck(evaluationId, customProbe || undefined);
      setLastCheck(res);
      setCustomProbe('');
      loadChecks();
    } catch (err: any) {
      alert(`Contamination check failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-slate-900">CONTAMINATION TESTING CENTER</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
              CANARY ISOLATION
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verifies that prior test context and session memory do not leak across evaluation runs.
          </p>
        </div>
      </div>

      {/* Trigger Box */}
      <form onSubmit={handleRunCheck} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-2">
            <Bug className="w-4 h-4 text-emerald-600" />
            <span>EXECUTE CROSS-SESSION CANARY PROBE</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Generates unique cryptographically random token
          </span>
        </div>

        <div>
          <label className="text-slate-700 font-semibold text-[11px] font-mono block mb-1">
            CUSTOM PROBE QUERY (OPTIONAL)
          </label>
          <input
            type="text"
            placeholder="Leave empty to use standard zero-trust canary isolation probe..."
            value={customProbe}
            onChange={(e) => setCustomProbe(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isRunning}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'PROBING MEMORY ISOLATION...' : 'RUN CONTAMINATION CHECK'}</span>
          </button>
        </div>
      </form>

      {/* Latest Result Card */}
      {lastCheck && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-mono">LATEST CANARY VERIFICATION</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
              lastCheck.is_clean
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
            }`}>
              {lastCheck.is_clean ? '✓ CLEAN (NO CONTAMINATION)' : '⚠ RESIDUAL CONTEXT DETECTED'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[10px] font-semibold">CANARY TOKEN</span>
              <div className="text-blue-700 font-bold mt-0.5">{lastCheck.canary_token}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[10px] font-semibold">ISOLATION STATUS</span>
              <div className="text-emerald-700 font-bold mt-0.5">{lastCheck.isolation_status}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[10px] font-semibold">CHECK TIMESTAMP</span>
              <div className="text-slate-800 font-medium mt-0.5">{new Date(lastCheck.created_at).toLocaleTimeString()}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
            <span className="text-slate-500 text-[10px] font-semibold">MODEL RESPONSE TO CANARY PROBE:</span>
            <div className="text-slate-800 leading-relaxed font-mono">{lastCheck.target_response}</div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 font-mono">CONTAMINATION CHECK AUDIT LOG</h3>
          <span className="text-xs font-mono text-slate-500 font-semibold">{checks.length} Checks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                <th className="pb-3 font-semibold">CHECK ID</th>
                <th className="pb-3 font-semibold">CANARY TOKEN</th>
                <th className="pb-3 font-semibold">STATUS</th>
                <th className="pb-3 font-semibold">ISOLATION</th>
                <th className="pb-3 font-semibold text-right">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No contamination checks run yet for this evaluation.
                  </td>
                </tr>
              ) : (
                checks.map((chk) => (
                  <tr key={chk.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-slate-900 font-bold">{chk.id}</td>
                    <td className="py-3 text-blue-700 font-bold">{chk.canary_token}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        chk.is_clean ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {chk.is_clean ? 'CLEAN' : 'CONTAMINATED'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700">{chk.isolation_status}</td>
                    <td className="py-3 text-right text-slate-500">{new Date(chk.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
