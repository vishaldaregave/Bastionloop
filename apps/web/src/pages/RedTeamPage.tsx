import React, { useState, useEffect } from 'react';
import {
  Swords, Play, Lock, Eye, CheckCircle2, ShieldAlert,
  AlertTriangle, Clock, RefreshCw, Sparkles, BookOpen
} from 'lucide-react';
import { Attack, AttackLibraryItem, Role } from '../types';
import { api } from '../services/api';
import { PayloadModal } from '../components/PayloadModal';

interface RedTeamPageProps {
  evaluationId: string;
  currentRole: Role;
  onAttackExecuted: () => void;
}

export const RedTeamPage: React.FC<RedTeamPageProps> = ({
  evaluationId,
  currentRole,
  onAttackExecuted,
}) => {
  const [library, setLibrary] = useState<AttackLibraryItem[]>([]);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [category, setCategory] = useState('prompt_injection');
  const [severity, setSeverity] = useState('HIGH');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Payload modal state
  const [modalAttackId, setModalAttackId] = useState<string | null>(null);

  useEffect(() => {
    if (evaluationId) {
      loadData();
    }
  }, [evaluationId]);

  const loadData = async () => {
    try {
      const [libData, attackData] = await Promise.all([
        api.getAttackLibrary(evaluationId),
        api.listAttacks(evaluationId),
      ]);
      setLibrary(libData);
      setAttacks(attackData);
      if (libData.length > 0 && !selectedPrompt) {
        setSelectedPrompt(libData[0].sample_prompt);
        setCategory(libData[0].category);
        setSeverity(libData[0].severity);
      }
    } catch (e) {}
  };

  const handleSelectFromLibrary = (item: AttackLibraryItem) => {
    setSelectedPrompt(item.sample_prompt);
    setCategory(item.category);
    setSeverity(item.severity);
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrompt) return;
    setIsExecuting(true);
    setLastResult(null);

    try {
      const result = await api.submitAttack(evaluationId, {
        prompt: selectedPrompt,
        category,
        severity,
      });
      setLastResult(result);
      loadData();
      onAttackExecuted();
    } catch (err: any) {
      alert(`Attack failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-slate-900">RED TEAM ADVERSARIAL WORKSPACE</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 font-bold">
              CONTROLLED ENVIRONMENT
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Execute adversarial test vectors. Raw exploit payloads are vaulted and redacted from Blue Team views.
          </p>
        </div>
      </div>

      {/* Main Execution Studio & Attack Library */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Custom Prompt Runner & Execution Result */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleExecute} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-2">
                <Swords className="w-4 h-4 text-red-600" />
                <span>ADVERSARIAL PAYLOAD GENERATOR</span>
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-800 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prompt_injection">Prompt Injection</option>
                  <option value="instruction_override">Instruction Override</option>
                  <option value="context_manipulation">Context Manipulation</option>
                  <option value="role_confusion">Role Confusion</option>
                  <option value="system_prompt_extraction">System Prompt Extraction</option>
                  <option value="tool_abuse">Tool Abuse Simulation</option>
                  <option value="data_exfiltration">Data Exfiltration</option>
                  <option value="multi_turn_adversarial">Multi-Turn Adversarial</option>
                </select>

                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[11px] font-mono text-red-700 font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-700 font-semibold block mb-1">
                ADVERSARIAL PROMPT PAYLOAD (CONFIDENTIAL)
              </label>
              <textarea
                rows={4}
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                placeholder="Enter adversarial prompt vector..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>PAYLOAD CONFIDENTIAL — VAULTED IN AUDIT REPOSITORY</span>
              </span>
              <button
                type="submit"
                disabled={isExecuting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold transition-all shadow-md shadow-red-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                <span>{isExecuting ? 'INTERCEPTING & EXECUTING...' : 'LAUNCH ATTACK VECTOR'}</span>
              </button>
            </div>
          </form>

          {/* Last Result Box */}
          {lastResult && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-2">
                  <span>EXECUTION RESULT</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    lastResult.result_class === 'BLOCKED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : lastResult.result_class === 'VULNERABLE'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {lastResult.result_class}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Latency: {lastResult.latency_ms}ms &bull; Session: {lastResult.session_id}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed">
                {lastResult.response}
              </div>

              {lastResult.blocked_by && (
                <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                  Interception Rule: <span className="font-bold">{lastResult.blocked_by}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Attack Scenario Library */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-mono text-xs font-bold">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>ATTACK SCENARIO LIBRARY</span>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {library.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectFromLibrary(item)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-300 cursor-pointer transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600">
                    {item.name}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold">
                    {item.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Execution History Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 font-mono">ATTACK EXECUTION HISTORY</h3>
          <span className="text-xs font-mono text-slate-500 font-semibold">{attacks.length} Executions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                <th className="pb-3 font-semibold">ATTACK ID</th>
                <th className="pb-3 font-semibold">CATEGORY</th>
                <th className="pb-3 font-semibold">SEVERITY</th>
                <th className="pb-3 font-semibold">RESULT CLASS</th>
                <th className="pb-3 font-semibold">LATENCY</th>
                <th className="pb-3 font-semibold">PAYLOAD HASH</th>
                <th className="pb-3 font-semibold text-right">CONFIDENTIAL PAYLOAD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No attacks executed yet in this evaluation session.
                  </td>
                </tr>
              ) : (
                attacks.map((atk) => (
                  <tr key={atk.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-slate-900 font-bold">{atk.id}</td>
                    <td className="py-3 text-slate-700">{atk.category}</td>
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-200 font-bold">
                        {atk.severity}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        atk.result_class === 'BLOCKED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : atk.result_class === 'VULNERABLE'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {atk.result_class}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{atk.latency_ms}ms</td>
                    <td className="py-3 text-blue-700 font-bold">{atk.payload_hash.slice(0, 16)}...</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setModalAttackId(atk.id)}
                        className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-amber-700 font-bold flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>REVEAL (RBAC)</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {modalAttackId && (
        <PayloadModal
          isOpen={true}
          onClose={() => setModalAttackId(null)}
          evaluationId={evaluationId}
          attackId={modalAttackId}
          currentRole={currentRole}
        />
      )}
    </div>
  );
};
