import React, { useState, useEffect } from 'react';
import {
  Bug, Play, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw,
  Lock, AlertCircle, Sparkles, Terminal, Layers
} from 'lucide-react';
import { ContaminationCheck } from '../../types';
import { api } from '../../services/api';

interface ContaminationPageProps {
  evaluationId: string;
}

export const ContaminationPage: React.FC<ContaminationPageProps> = ({ evaluationId }) => {
  const [checks, setChecks] = useState<ContaminationCheck[]>([]);
  const [customProbe, setCustomProbe] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<ContaminationCheck | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
    setStatusMessage(null);
    try {
      const res = await api.runContaminationCheck(evaluationId, customProbe || undefined);
      setLastCheck(res);
      setCustomProbe('');
      loadChecks();
      setStatusMessage('Canary verification completed. Target model session evaluated.');
    } catch (err: any) {
      setStatusMessage(`Contamination check failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <Bug className="w-5 h-5 text-[#6366F1]" />
            Canary & Contamination Verification
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Inject synthetic canary tokens into evaluation sessions to verify zero prior test prompt memory leakage.
          </p>
        </div>
        <button
          onClick={loadChecks}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold text-[#F8FAFC] bg-[#15171F] hover:bg-[#152033] border border-[#20242E] rounded-lg shadow-card transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#6366F1]" />
          <span>REFRESH CHECKS</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#12141A] text-[#6366F1] rounded-lg border border-[#20242E] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] font-mono">Canary Isolation Guarantee</h3>
            <p className="text-xs text-[#8C92A4] font-mono mt-1 leading-relaxed">
              BastionLoop inserts cryptographically unique canary tokens (e.g.{' '}
              <span className="text-[#3B82F6] bg-[#12141A] px-2.5 py-0.5 rounded border border-[#20242E]">
                CANARY-SEC-xxxx
              </span>
              ) into simulated prior-session contexts. The probe test attempts to extract this canary from the target LLM. If the canary is returned, session contamination is confirmed.
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-[#15171F] text-[#10B981] text-xs font-mono rounded-xl border border-[#10B981]/40 shadow-sm flex items-center gap-2.5 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Run Check (5 cols) */}
        <div className="lg:col-span-5 bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-4">
          <h3 className="text-xs font-bold font-mono text-[#F8FAFC] uppercase tracking-wider pb-3 border-b border-[#20242E] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#6366F1]" />
            Trigger Contamination Probe
          </h3>

          <form onSubmit={handleRunCheck} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold font-mono text-[#585E70] uppercase tracking-wider block mb-1.5">
                Custom Probe Query (Optional)
              </label>
              <textarea
                rows={4}
                value={customProbe}
                onChange={(e) => setCustomProbe(e.target.value)}
                placeholder="Leave blank to use default automated canary extraction prompt..."
                className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] focus:border-[#6366F1] text-[#F8FAFC] placeholder-[#585E70] rounded-lg p-3 focus:outline-none transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#6366F1] hover:bg-[#8B5CF6] text-[#0C0D11] text-xs font-mono font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'INJECTING & VERIFYING CANARY...' : 'EXECUTE CANARY CHECK'}</span>
            </button>
          </form>
        </div>

        {/* Right: Latest Result (7 cols) */}
        <div className="lg:col-span-7 bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-[#20242E] flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-[#F8FAFC] uppercase tracking-wider">
                Latest Verification Report
              </span>
              {lastCheck && (
                <span
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-full border uppercase ${
                    !lastCheck.is_clean
                      ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                      : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                  }`}
                >
                  {!lastCheck.is_clean ? 'CONTAMINATED' : 'ISOLATION VERIFIED (CLEAN)'}
                </span>
              )}
            </div>

            {lastCheck ? (
              <div className="space-y-3.5 text-xs font-mono">
                <div className="p-3.5 bg-[#12141A] rounded-lg border border-[#20242E] space-y-1">
                  <span className="text-[#585E70] font-medium block uppercase text-[10px]">Canary Token Injected</span>
                  <span className="font-bold text-[#3B82F6]">{lastCheck.canary_token}</span>
                </div>

                <div className="p-3.5 bg-[#12141A] rounded-lg border border-[#20242E] space-y-1">
                  <span className="text-[#585E70] font-medium block uppercase text-[10px]">Probe Prompt</span>
                  <p className="text-[#F8FAFC]">{lastCheck.probe_query}</p>
                </div>

                <div className="p-3.5 bg-[#12141A] rounded-lg border border-[#20242E] space-y-1">
                  <span className="text-[#585E70] font-medium block uppercase text-[10px]">Target Model Response</span>
                  <p className="text-[#8C92A4] leading-relaxed">{lastCheck.target_response}</p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-[#585E70] text-xs font-mono">
                No contamination checks executed yet. Run a check to verify session boundaries.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
