import React, { useState } from 'react';
import { History, Shield, CheckCircle2, RotateCcw, Lock, UserCheck, Check } from 'lucide-react';

interface DeploymentHistoryPageProps {
  evaluationId: string;
}

export const DeploymentHistoryPage: React.FC<DeploymentHistoryPageProps> = ({ evaluationId }) => {
  const [deployments, setDeployments] = useState<any[]>([
    {
      id: 'dep-004',
      version: 'v2.1.0',
      policy_name: 'Multi-Layer Instruction Fence + Delimiter Shield',
      author: 'blue_operator',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'ACTIVE',
      commit_hash: '9f2c8d104a3e',
      notes: 'Added strict instruction token fences against roleplay jailbreaks'
    },
    {
      id: 'dep-003',
      version: 'v2.0.0',
      policy_name: 'Pre-LLM Gateway Validation Rules',
      author: 'blue_operator',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: 'SUPERSEDED',
      commit_hash: '3e7b1a998c21',
      notes: 'Initial pre-execution heuristic regex filters'
    },
    {
      id: 'dep-002',
      version: 'v1.5.0',
      policy_name: 'Basic Regex Keyword Blocker',
      author: 'admin',
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      status: 'ROLLED_BACK',
      commit_hash: '1a8f902b4d55',
      notes: 'High false positive rate on benchmark test set'
    },
    {
      id: 'dep-001',
      version: 'v1.0.0',
      policy_name: 'Default Passthrough Baseline',
      author: 'system',
      timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
      status: 'ARCHIVED',
      commit_hash: '000000000000',
      notes: 'Baseline configuration for evaluation initialization'
    }
  ]);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleRollback = (dep: any) => {
    setStatusMsg(`Successfully rolled back active gateway defense to ${dep.version}.`);
    setDeployments(prev => prev.map(d => ({
      ...d,
      status: d.version === dep.version ? 'ACTIVE' : d.status === 'ACTIVE' ? 'SUPERSEDED' : d.status
    })));
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#10B981]" />
            Policy Deployment & Audit History
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Immutable audit record of all policy deployments, rollback events, and cryptographic signatures.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-[#152033] text-[#10B981] text-xs rounded-xl border border-[#10B981]/40 font-semibold shadow-sm">
          {statusMsg}
        </div>
      )}

      {/* Deployment Timeline */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card overflow-hidden">
        <div className="p-5 border-b border-[#20242E] font-bold text-[#F8FAFC] text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#10B981]" />
            Deployment Ledger ({deployments.length})
          </span>
          <span className="text-xs text-[#585E70]">Cryptographically Chained</span>
        </div>

        <div className="divide-y divide-[#20242E]/50">
          {deployments.map((dep) => {
            const isActive = dep.status === 'ACTIVE';
            return (
              <div key={dep.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#152033]/40">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#10B981]">{dep.version}</span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      isActive ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' :
                      dep.status === 'ROLLED_BACK' ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30' :
                      'bg-[#12141A] text-[#585E70] border border-[#20242E]'
                    }`}>
                      {dep.status}
                    </span>
                    <span className="text-xs text-[#585E70] font-mono">commit: {dep.commit_hash}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#F8FAFC]">{dep.policy_name}</h4>
                  <p className="text-xs text-[#8C92A4]">{dep.notes}</p>
                  <div className="text-xs text-[#585E70] flex items-center gap-4 pt-1">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#585E70]" /> {dep.author}
                    </span>
                    <span>{new Date(dep.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#152033] text-[#10B981] border border-[#10B981] text-xs font-bold rounded-lg shadow-sm">
                      <Check className="w-4 h-4 text-[#10B981]" /> Active on Gateway
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRollback(dep)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#8C92A4] hover:text-[#F8FAFC] bg-[#12141A] hover:bg-[#152033] rounded-lg transition-colors border border-[#20242E] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#10B981]" />
                      Rollback to {dep.version}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
