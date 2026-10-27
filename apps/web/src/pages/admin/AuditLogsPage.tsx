import React, { useState, useEffect } from 'react';
import { FileText, Shield, Search, Filter, RefreshCw, Lock, UserCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';

interface AuditLogsPageProps {
  evaluationId: string;
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ evaluationId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, [evaluationId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const chain = await api.getEvidenceChain(evaluationId);
      setLogs(chain || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = !search ||
      (l.event_type && l.event_type.toLowerCase().includes(search.toLowerCase())) ||
      (l.actor && l.actor.toLowerCase().includes(search.toLowerCase())) ||
      (l.event_hash && l.event_hash.toLowerCase().includes(search.toLowerCase())) ||
      (l.id && l.id.toLowerCase().includes(search.toLowerCase()));

    const matchesType = filterType === 'ALL' || l.event_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Security Audit Logs & Ledger</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Tamper-evident audit trail of authentication events, policy alterations, probe executions, and disclosures.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#F0F2F6] bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] hover:border-[#2D3342] rounded-lg shadow-subtle transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${loading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#15171F] p-4 rounded-xl border border-[#20242E] shadow-card flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 w-full md:w-96">
          <Search className="w-4 h-4 text-[#585E70]" />
          <input
            type="text"
            placeholder="Filter by event type, actor username, or hash..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg px-3 py-2 text-[#F0F2F6] placeholder-[#585E70] focus:outline-none focus:border-[#2D3342]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'EVALUATION_CREATED', 'ATTACK_SUBMITTED', 'DEFENSE_APPLIED', 'EVIDENCE_RECORDED'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                filterType === t
                  ? 'bg-[#1E283C] text-white border border-[#3B82F6]'
                  : 'bg-[#12141A] text-[#8C92A4] hover:text-[#F0F2F6] border border-[#20242E]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#191C24] font-semibold text-[#F8FAFC] text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#3B82F6]" />
            Audit Ledger Entries ({filteredLogs.length})
          </span>
          <span className="text-xs text-[#585E70] font-mono">SHA-256 Chained</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#585E70] text-xs font-mono">Verifying and loading audit events...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[#585E70] text-xs font-mono">No audit logs match criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#141720] text-[#585E70] font-mono font-bold text-[10px] uppercase border-b border-[#20242E]">
                  <th className="py-3 px-4">Block #</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Subject Actor</th>
                  <th className="py-3 px-4">Cryptographic Hash</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#191C24] font-mono text-[11px]">
                {filteredLogs.map((ev, i) => (
                  <tr key={ev.id || i} className="hover:bg-[#1D212C]/40 transition-colors">
                    <td className="py-3 px-4 text-[#60A5FA] font-bold">#{ev.event_seq ?? i + 1}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-[#191C25] text-[#60A5FA] border border-[#2563EB] rounded font-semibold text-[10px]">
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#F0F2F6]">{ev.actor || 'system'}</td>
                    <td className="py-3 px-4 text-[#60A5FA] truncate max-w-xs">{ev.event_hash}</td>
                    <td className="py-3 px-4 text-right text-[#585E70]">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
