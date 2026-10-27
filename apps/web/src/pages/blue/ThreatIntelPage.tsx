import React, { useState } from 'react';
import { Crosshair, Database, Shield, Radio, Search, Filter, ExternalLink, Zap } from 'lucide-react';

export const ThreatIntelPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const signatures = [
    { id: 'SIG-2024-001', name: 'Direct System Prompt Exfiltration (Zero-Turn)', severity: 'HIGH', category: 'Extraction', source: 'OWASP LLM01', status: 'SYNCHRONIZED' },
    { id: 'SIG-2024-002', name: 'Universal Adversarial Suffix Injection (GCG)', severity: 'CRITICAL', category: 'Jailbreak', source: 'arXiv:2307.15043', status: 'SYNCHRONIZED' },
    { id: 'SIG-2024-003', name: 'Base64 / UTF-8 Polyglot Token Wrap', severity: 'MEDIUM', category: 'Evasion', source: 'MITRE ATLAS', status: 'SYNCHRONIZED' },
    { id: 'SIG-2024-004', name: 'Multi-Turn Context Usurpation via Fake Assistant Turns', severity: 'HIGH', category: 'Role Hijack', source: 'BastionLoop Zero-Day Lab', status: 'SYNCHRONIZED' },
    { id: 'SIG-2024-005', name: 'Canary Extraction via Code Interpreter Formatting', severity: 'CRITICAL', category: 'Canary Trap', source: 'BastionLoop Internal', status: 'SYNCHRONIZED' }
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-8 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-[#10B981]" />
            Threat Intelligence & Signature Feed
          </h1>
          <p className="text-[#8C92A4] text-xs mt-1">
            Real-time feed of known adversarial heuristics, CVE mappings, and zero-day LLM attack patterns.
          </p>
        </div>
      </div>

      <div className="bg-[#15171F] p-6 rounded-xl border border-[#20242E] shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#20242E] pb-3">
          <span className="text-xs font-bold text-[#F8FAFC]">Known Adversarial Signatures ({signatures.length})</span>
          <span className="text-xs text-[#10B981] font-bold">Redis Threat Store Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#12141A] text-[#585E70] text-[10px] uppercase border-b border-[#20242E]">
              <tr>
                <th className="px-4 py-3">SIGNATURE ID</th>
                <th className="px-4 py-3">PATTERN DESIGNATION</th>
                <th className="px-4 py-3">SEVERITY</th>
                <th className="px-4 py-3">CATEGORY</th>
                <th className="px-4 py-3">ORIGIN / SOURCE</th>
                <th className="px-4 py-3 text-right">GATEWAY STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#20242E]/50">
              {signatures.map((sig) => (
                <tr key={sig.id} className="hover:bg-[#152033]/40">
                  <td className="px-4 py-3.5 font-bold text-[#10B981]">{sig.id}</td>
                  <td className="px-4 py-3.5 font-semibold text-[#F8FAFC]">{sig.name}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      sig.severity === 'CRITICAL' ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30' :
                      sig.severity === 'HIGH' ? 'bg-[#FF7A45]/15 text-[#FF7A45] border border-[#FF7A45]/30' :
                      'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                    }`}>
                      {sig.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#8C92A4]">{sig.category}</td>
                  <td className="px-4 py-3.5 text-[#585E70] text-[11px]">{sig.source}</td>
                  <td className="px-4 py-3.5 text-right text-[#10B981] font-bold text-[11px]">
                    ● {sig.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
