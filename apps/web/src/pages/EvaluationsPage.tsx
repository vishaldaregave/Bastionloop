import React, { useState } from 'react';
import {
  FolderKanban, Plus, Play, Pause, Square, RotateCcw,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Shield, Cpu, X
} from 'lucide-react';
import { Evaluation, EvalStatus } from '../types';
import { api } from '../services/api';

interface EvaluationsPageProps {
  evaluations: Evaluation[];
  selectedEvalId: string;
  onSelectEval: (id: string) => void;
  onRefresh: () => void;
}

export const EvaluationsPage: React.FC<EvaluationsPageProps> = ({
  evaluations,
  selectedEvalId,
  onSelectEval,
  onRefresh,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [targetModel, setTargetModel] = useState('llama3.2');
  const [modelVersion, setModelVersion] = useState('3.2.1-instruct');
  const [description, setDescription] = useState('');
  const [riskProfile, setRiskProfile] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('CRITICAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName) return;
    setIsSubmitting(true);
    try {
      const created = await api.createEvaluation({
        project_name: projectName,
        target_model: targetModel,
        model_version: modelVersion,
        description,
        risk_profile: riskProfile,
      });
      setShowCreateModal(false);
      setProjectName('');
      setDescription('');
      onRefresh();
      onSelectEval(created.id);
    } catch (err: any) {
      alert(`Failed to create evaluation: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, action: 'start' | 'pause' | 'resume' | 'terminate' | 'reset') => {
    try {
      if (action === 'start') await api.startEvaluation(id);
      else if (action === 'pause') await api.pauseEvaluation(id);
      else if (action === 'resume') await api.resumeEvaluation(id);
      else if (action === 'terminate') await api.terminateEvaluation(id);
      else if (action === 'reset') await api.resetModelSession(id);
      onRefresh();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-900">EVALUATION CONTROL CENTER</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage adversarial test environments, target models, and zero-trust session states.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>NEW EVALUATION PROJECT</span>
        </button>
      </div>

      {/* Evaluations Table / Card Grid */}
      <div className="grid grid-cols-1 gap-4">
        {evaluations.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-subtle">
            <FolderKanban className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-800 font-mono">No Evaluations Found</div>
            <p className="text-xs text-slate-500 mt-1">Click "New Evaluation Project" above to initialize your first safety benchmark.</p>
          </div>
        ) : (
          evaluations.map((ev) => {
            const isSelected = ev.id === selectedEvalId;

            let statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
            if (ev.status === 'RUNNING') statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (ev.status === 'PAUSED') statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
            if (ev.status === 'COMPLETED') statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
            if (ev.status === 'QUARANTINED') statusBadgeClass = 'bg-red-50 text-red-700 border-red-200';

            return (
              <div
                key={ev.id}
                className={`p-5 rounded-2xl bg-white border transition-all ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-card' : 'border-slate-200 hover:border-slate-300 shadow-subtle'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{ev.id}</span>
                      <span className="text-xs text-slate-500 font-medium">— {ev.project_name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${statusBadgeClass}`}>
                        {ev.status}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
                        RISK: {ev.risk_profile}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Target: <span className="text-blue-700 font-mono font-bold">{ev.target_model}</span> ({ev.model_version}) &bull; Created by: <span className="text-slate-800 font-mono font-medium">{ev.created_by}</span> &bull; {new Date(ev.created_at).toLocaleDateString()}
                    </p>
                    {ev.description && (
                      <p className="text-xs text-slate-600 pt-1">{ev.description}</p>
                    )}
                  </div>

                  {/* Control Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectEval(ev.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      {isSelected ? 'ACTIVE' : 'SELECT'}
                    </button>

                    {ev.status === 'READY' || ev.status === 'PAUSED' ? (
                      <button
                        onClick={() => handleStatusChange(ev.id, 'start')}
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                        title="Start / Resume Evaluation"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    ) : ev.status === 'RUNNING' ? (
                      <button
                        onClick={() => handleStatusChange(ev.id, 'pause')}
                        className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer"
                        title="Pause Evaluation"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : null}

                    {ev.status === 'RUNNING' || ev.status === 'PAUSED' ? (
                      <button
                        onClick={() => handleStatusChange(ev.id, 'terminate')}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer"
                        title="Terminate Evaluation"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleStatusChange(ev.id, 'reset')}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                      title="Purge / Reset Target Session Context"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Project Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 relative shadow-elevated space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-mono font-bold text-slate-900 uppercase">
                CREATE NEW EVALUATION PROJECT
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-700 font-semibold text-[11px] block mb-1">PROJECT NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Llama-3.2 Safety Benchmark '26"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-1">TARGET MODEL</label>
                  <select
                    value={targetModel}
                    onChange={(e) => setTargetModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="llama3.2">llama3.2 (Ollama / Local)</option>
                    <option value="phi3">phi3 (Ollama / Local)</option>
                    <option value="mistral">mistral (Ollama / Local)</option>
                    <option value="mock-llama3-safety-eval">Mock Provider (Air-Gapped / CI)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold text-[11px] block mb-1">MODEL VERSION</label>
                  <input
                    type="text"
                    value={modelVersion}
                    onChange={(e) => setModelVersion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold text-[11px] block mb-1">RISK PROFILE</label>
                <select
                  value={riskProfile}
                  onChange={(e) => setRiskProfile(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CRITICAL">CRITICAL (Zero-Trust strict isolation)</option>
                  <option value="HIGH">HIGH (Standard adversarial testing)</option>
                  <option value="MEDIUM">MEDIUM (Functional safety test)</option>
                  <option value="LOW">LOW (Baseline evaluation)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold text-[11px] block mb-1">DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Evaluation scope, adversarial vectors, and compliance requirements..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-700 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-semibold shadow-sm cursor-pointer"
              >
                {isSubmitting ? 'CREATING...' : 'INITIALIZE EVALUATION'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
