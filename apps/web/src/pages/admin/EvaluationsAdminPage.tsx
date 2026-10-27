import React, { useState } from 'react';
import {
  FolderKanban, Plus, Play, Pause, Square, RotateCcw,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Shield, Cpu, X, Search
} from 'lucide-react';
import { Evaluation, EvalStatus } from '../../types';
import { api } from '../../services/api';

interface EvaluationsAdminPageProps {
  evaluations: Evaluation[];
  selectedEvalId: string;
  onSelectEval: (id: string) => void;
  onRefresh: () => void;
}

export const EvaluationsAdminPage: React.FC<EvaluationsAdminPageProps> = ({
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const getStatusBadge = (status: EvalStatus) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono rounded-md bg-[#0D2820] text-[#10B981] border border-[#10B981]/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            RUNNING
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono rounded-md bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/40">
            <Clock className="w-3.5 h-3.5" />
            PAUSED
          </span>
        );
      case 'COMPLETED':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono rounded-md bg-[#1E222D] text-[#60A5FA] border border-[#20242E]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono rounded-md bg-[#191C25] text-[#60A5FA] border border-[#2563EB]">
            {status || 'READY'}
          </span>
        );
    }
  };

  const filteredEvals = evaluations.filter(ev =>
    searchQuery === '' ||
    ev.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.target_model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Evaluations Management</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Create, configure, monitor, and enforce lifecycle limits on adversarial AI safety testing environments.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#3B82F6] text-white text-xs font-mono font-bold rounded-lg transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Evaluation Scope
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#15171F] p-4 rounded-xl border border-[#20242E] shadow-card flex items-center gap-4">
        <Search className="w-4 h-4 text-[#585E70]" />
        <input
          type="text"
          placeholder="Filter evaluations by project name, ID, or target model..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs bg-[#12141A] border border-[#20242E] rounded-lg px-3 py-2 text-[#F0F2F6] placeholder-[#585E70] focus:outline-none focus:border-[#2D3342] font-mono"
        />
      </div>

      {/* Evaluations List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEvals.map((ev) => {
          const isSelected = ev.id === selectedEvalId;
          return (
            <div
              key={ev.id}
              className={`bg-[#15171F] rounded-xl border p-6 shadow-card transition-all ${
                isSelected
                  ? 'border-[#3B82F6] shadow-sm'
                  : 'border-[#20242E] hover:border-[#2D3342]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-[#F8FAFC] text-base">{ev.id}</span>
                    {getStatusBadge(ev.status)}
                    <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                      ev.risk_profile === 'CRITICAL' ? 'bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/40' :
                      ev.risk_profile === 'HIGH' ? 'bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/40' :
                      'bg-[#12141A] text-[#60A5FA] border border-[#20242E]'
                    }`}>
                      {ev.risk_profile} RISK
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#F8FAFC]">{ev.project_name}</h3>
                  <p className="text-xs text-[#8C92A4]">{ev.description || 'Production adversarial safety evaluation suite'}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#585E70] pt-1 font-mono">
                    <span>Target: <strong className="text-[#F0F2F6]">{ev.target_model}:{ev.model_version}</strong></span>
                    <span>Created: {new Date(ev.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {ev.status === 'READY' || ev.status === 'DRAFT' || ev.status === 'PAUSED' ? (
                    <button
                      onClick={() => handleStatusChange(ev.id, ev.status === 'PAUSED' ? 'resume' : 'start')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0D2820] hover:bg-[#0E3B37] text-[#10B981] border border-[#10B981]/50 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {ev.status === 'PAUSED' ? 'Resume' : 'Start'}
                    </button>
                  ) : null}

                  {ev.status === 'RUNNING' ? (
                    <button
                      onClick={() => handleStatusChange(ev.id, 'pause')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2B1D08] hover:bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/50 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </button>
                  ) : null}

                  {ev.status !== 'COMPLETED' ? (
                    <button
                      onClick={() => handleStatusChange(ev.id, 'terminate')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2D1217] hover:bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/50 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Terminate
                    </button>
                  ) : null}

                  <button
                    onClick={() => onSelectEval(ev.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1E283C] text-white border border-[#3B82F6] shadow-sm'
                        : 'bg-[#12141A] text-[#8C92A4] hover:text-[#F0F2F6] border border-[#20242E] hover:bg-[#1D212C]'
                    }`}
                  >
                    {isSelected ? 'Active Scope' : 'Select Scope'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Evaluation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0C0D11]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#15171F] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#2D3342] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#20242E]">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-[#3B82F6]" />
                Initialize New Evaluation Scope
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#585E70] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                  Evaluation Scope Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 FinTech LLM Robustness Audit"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] placeholder-[#585E70] focus:border-[#2D3342]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                    Target Model
                  </label>
                  <input
                    type="text"
                    required
                    value={targetModel}
                    onChange={e => setTargetModel(e.target.value)}
                    className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] focus:border-[#2D3342]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                    Model Version / Tag
                  </label>
                  <input
                    type="text"
                    required
                    value={modelVersion}
                    onChange={e => setModelVersion(e.target.value)}
                    className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] focus:border-[#2D3342]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                  Risk Profile Classification
                </label>
                <select
                  value={riskProfile}
                  onChange={e => setRiskProfile(e.target.value as any)}
                  className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] font-semibold focus:border-[#2D3342]"
                >
                  <option value="CRITICAL">CRITICAL (Financial / Infrastructure LLM)</option>
                  <option value="HIGH">HIGH (Enterprise Internal Assistant)</option>
                  <option value="MEDIUM">MEDIUM (Public Conversational Bot)</option>
                  <option value="LOW">LOW (Experimental R&D)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                  Scope Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Testing objectives, threat model assumptions, and compliance requirements..."
                  className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] placeholder-[#585E70] focus:border-[#2D3342]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#8C92A4] bg-[#12141A] border border-[#20242E] rounded-lg hover:bg-[#1D212C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#3B82F6] rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Evaluation Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
