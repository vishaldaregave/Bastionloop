import React, { useState, useEffect } from 'react';
import { Cpu, RotateCcw, CheckCircle2, AlertTriangle, Send, RefreshCw, Lock } from 'lucide-react';
import { api } from '../services/api';

interface TargetLlmPageProps {
  evaluationId: string;
}

export const TargetLlmPage: React.FC<TargetLlmPageProps> = ({ evaluationId }) => {
  const [llmHealth, setLlmHealth] = useState<any>(null);
  const [prompt, setPrompt] = useState('');
  const [applyDefenses, setApplyDefenses] = useState(true);
  const [inferResult, setInferResult] = useState<any>(null);
  const [isInferring, setIsInferring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (evaluationId) {
      checkHealth();
    }
  }, [evaluationId]);

  const checkHealth = async () => {
    try {
      const h = await api.getLlmHealth();
      setLlmHealth(h);
    } catch (e) {
      setLlmHealth({ status: 'offline', error: 'LLM sandbox unreachable', provider: 'MockLLMProvider', configured_model: 'llama3.2' });
    }
  };

  const handleInfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsInferring(true);
    setInferResult(null);
    try {
      const res = await api.infer(evaluationId, prompt, applyDefenses);
      setInferResult(res);
    } catch (err: any) {
      alert(`Inference failed: ${err.message}`);
    } finally {
      setIsInferring(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetModelSession(evaluationId);
      setResetMessage(`Session memory context purged: ${res.message}`);
      setTimeout(() => setResetMessage(null), 5000);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-slate-900">TARGET LLM EXECUTION SANDBOX</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-bold">
              ISOLATED RUNTIME
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Target model execution environment with session isolation, canary context tracking, and state reset.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-purple-300 text-purple-700 text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-subtle disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>PURGE SESSION MEMORY</span>
        </button>
      </div>

      {resetMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center gap-2 animate-fade-in font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Target Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-subtle">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">RUNTIME PROVIDER</span>
          <div className="text-lg font-mono font-bold text-slate-900 mt-1">
            {llmHealth?.provider || 'Ollama / Mock LLM'}
          </div>
          <div className="text-xs font-mono text-purple-700 font-bold mt-0.5">
            Model: {llmHealth?.configured_model || 'llama3.2'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-subtle">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">DOCKER BOUNDARY</span>
          <div className="text-lg font-mono font-bold text-emerald-700 mt-1">
            llm_net (ISOLATED)
          </div>
          <div className="text-xs font-mono text-slate-500 mt-0.5">
            Egress: Drop-by-default
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-subtle">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">SESSION MEMORY</span>
          <div className="text-lg font-mono font-bold text-blue-700 mt-1">
            ISOLATED SESSION
          </div>
          <div className="text-xs font-mono text-slate-500 mt-0.5">
            Auto-purged between evaluations
          </div>
        </div>
      </div>

      {/* Direct Controlled Inference Studio */}
      <form onSubmit={handleInfer} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600" />
            <span>DIRECT INFERENCE PROBE (CONTROL PLANE BROKERED)</span>
          </span>
          <label className="flex items-center gap-2 text-xs font-mono text-slate-700 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={applyDefenses}
              onChange={(e) => setApplyDefenses(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Apply Active Policy Defenses</span>
          </label>
        </div>

        <div>
          <label className="text-slate-700 font-semibold text-[11px] font-mono block mb-1">PROMPT QUERY</label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type query to evaluate model response under current zero-trust policies..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isInferring}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isInferring ? 'EVALUATING MODEL...' : 'SEND INFERENCE PROBE'}</span>
          </button>
        </div>

        {/* Inference Response Box */}
        {inferResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">RESULT CLASSIFICATION:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                inferResult.result_class === 'BLOCKED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {inferResult.result_class}
              </span>
            </div>
            <div className="text-slate-800 leading-relaxed pt-2 border-t border-slate-200 whitespace-pre-wrap font-mono">
              {inferResult.response}
            </div>
            <div className="pt-2 flex justify-between text-[10px] text-slate-500 border-t border-slate-200">
              <span>Latency: {inferResult.latency_ms}ms</span>
              <span>Provider: {inferResult.provider_name}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
