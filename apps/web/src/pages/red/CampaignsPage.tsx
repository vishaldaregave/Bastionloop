import React, { useState } from 'react';
import {
  Flame, Play, Pause, Plus, CheckCircle2, AlertTriangle,
  Clock, RotateCcw, Shield, Check, X, FileText, Sparkles
} from 'lucide-react';

interface CampaignsPageProps {
  evaluationId: string;
}

export const CampaignsPage: React.FC<CampaignsPageProps> = ({ evaluationId }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const [campaigns, setCampaigns] = useState([
    {
      id: 'CMP-001',
      name: 'Llama-3.2 Standard Adversarial Safety Benchmark',
      target: 'llama3.2 (Ollama Isolated)',
      status: 'RUNNING',
      total_tests: 28,
      completed: 24,
      bypasses: 2,
      started_at: '2026-10-10 10:00:00',
      categories: ['Prompt Injection', 'Canary Extraction', 'Delimiter Override']
    },
    {
      id: 'CMP-002',
      name: 'OWASP LLM Top 10 Full Surface Audit',
      target: 'llama3.2 (Ollama Isolated)',
      status: 'READY',
      total_tests: 40,
      completed: 0,
      bypasses: 0,
      started_at: 'Scheduled',
      categories: ['LLM01-LLM10 Comprehensive']
    },
    {
      id: 'CMP-003',
      name: 'Instruction Boundary & Delimiter Fuzzing',
      target: 'llama3.2 (Ollama Isolated)',
      status: 'COMPLETED',
      total_tests: 18,
      completed: 18,
      bypasses: 1,
      started_at: '2026-10-09 16:30:00',
      categories: ['Multi-turn Fuzzing', 'Polyglot Encodings']
    }
  ]);

  const [newCampaignName, setNewCampaignName] = useState('');
  const [selectedSuite, setSelectedSuite] = useState('Standard Adversarial Suite');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    const newCamp = {
      id: `CMP-00${campaigns.length + 1}`,
      name: newCampaignName,
      target: 'llama3.2 (Ollama Isolated)',
      status: 'READY',
      total_tests: 25,
      completed: 0,
      bypasses: 0,
      started_at: 'Just now',
      categories: [selectedSuite]
    };
    setCampaigns([newCamp, ...campaigns]);
    setShowCreateModal(false);
    setNewCampaignName('');
    triggerNotify(`Created new campaign ${newCamp.id}: ${newCamp.name}`);
  };

  const toggleCampaignState = (id: string, targetState: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: targetState };
      }
      return c;
    }));
    triggerNotify(`Campaign ${id} transitioned to ${targetState}.`);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans text-[#F0F2F6]">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-[#15171F] border border-[#EF4444] text-white text-xs font-mono shadow-sm flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2D1217] border border-[#EF4444] flex items-center justify-center text-[#EF4444] shadow-sm">
              <Flame className="w-5 h-5 text-[#EF4444]" />
            </div>
            <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">
              Adversarial Campaign Management
            </h1>
          </div>
          <p className="text-xs text-[#585E70] mt-1">
            Orchestrate automated multi-vector adversarial campaigns against authorized evaluation sandboxes.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:from-[#EF4444] hover:to-[#F87171] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Campaign</span>
        </button>
      </div>

      {/* Campaign List */}
      <div className="space-y-4 font-mono">
        {campaigns.map((cmp) => {
          const isRunning = cmp.status === 'RUNNING';
          const isReady = cmp.status === 'READY';
          const isCompleted = cmp.status === 'COMPLETED';
          const progress = Math.round((cmp.completed / cmp.total_tests) * 100);

          return (
            <div
              key={cmp.id}
              className={`p-6 rounded-xl bg-[#15171F] border transition-all shadow-card space-y-4 ${
                isRunning ? 'border-[#EF4444] shadow-sm' : 'border-[#20242E] hover:border-[#1E4870]'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#3B82F6]">{cmp.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isRunning
                          ? 'bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/30 animate-pulse'
                          : isReady
                          ? 'bg-[#1E222D] text-[#3B82F6] border border-[#2D3342]/30'
                          : 'bg-[#0D2820] text-[#10B981] border border-[#10B981]/30'
                      }`}
                    >
                      {cmp.status}
                    </span>
                    <span className="text-xs text-[#585E70]">{cmp.started_at}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">{cmp.name}</h3>
                  <div className="text-xs text-[#8C92A4]">
                    Target: <span className="text-[#3B82F6] font-semibold">{cmp.target}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {isRunning ? (
                    <button
                      onClick={() => toggleCampaignState(cmp.id, 'PAUSED')}
                      className="px-3.5 py-2 rounded-lg bg-[#12141A] hover:bg-[#191C25] border border-[#20242E] text-[#F59E0B] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  ) : isReady ? (
                    <button
                      onClick={() => toggleCampaignState(cmp.id, 'RUNNING')}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:from-[#EF4444] hover:to-[#F87171] text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Execute
                    </button>
                  ) : (
                    <button
                      onClick={() => triggerNotify(`Exporting summary report for ${cmp.id}...`)}
                      className="px-3.5 py-2 rounded-lg bg-[#12141A] hover:bg-[#191C25] border border-[#20242E] text-[#8C92A4] hover:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Report
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar & Sub Metrics */}
              <div className="space-y-2 pt-3 border-t border-[#20242E]">
                <div className="flex justify-between text-xs">
                  <span className="text-[#585E70]">Execution Progress</span>
                  <span className="text-[#F8FAFC] font-bold">
                    {cmp.completed} / {cmp.total_tests} vectors ({progress}%)
                  </span>
                </div>
                <div className="w-full bg-[#12141A] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isRunning ? 'bg-gradient-to-r from-[#DC2626] to-[#EF4444] shadow-[0_0_8px_#EF4444]' : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="w-full max-w-lg bg-[#15171F] border border-[#EF4444] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 bg-[#12141A] border-b border-[#20242E] flex items-center justify-between">
              <span className="font-bold text-[#F8FAFC] text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#EF4444]" /> Create Adversarial Campaign
              </span>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#585E70] hover:text-[#F8FAFC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[#8C92A4] font-bold">Campaign Identifier / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Llama-3.2 Context Escape Fuzzing Pass"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[#12141A] border border-[#20242E] text-[#F8FAFC] focus:outline-none focus:border-[#EF4444]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#8C92A4] font-bold">Test Vector Suite</label>
                <select
                  value={selectedSuite}
                  onChange={(e) => setSelectedSuite(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[#12141A] border border-[#20242E] text-[#F8FAFC] focus:outline-none focus:border-[#EF4444]"
                >
                  <option>Standard Adversarial Suite (25 Vectors)</option>
                  <option>OWASP LLM01-LLM10 Comprehensive (40 Vectors)</option>
                  <option>Instruction Boundary & Delimiter Fuzzing (18 Vectors)</option>
                  <option>State & Canary Leakage Probes (12 Vectors)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#12141A] border border-[#20242E] text-[#8C92A4] hover:text-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:from-[#EF4444] hover:to-[#F87171] text-white font-bold shadow-sm"
                >
                  Initialize Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
