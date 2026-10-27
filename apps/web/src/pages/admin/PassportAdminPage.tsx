import React, { useState, useEffect } from 'react';
import { Award, RefreshCw, Download, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { TestIntegrityPassport } from '../../types';
import { api } from '../../services/api';
import { PassportCard } from '../../components/PassportCard';

interface PassportAdminPageProps {
  evaluationId: string;
}

export const PassportAdminPage: React.FC<PassportAdminPageProps> = ({ evaluationId }) => {
  const [passport, setPassport] = useState<TestIntegrityPassport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (evaluationId) {
      loadPassport();
    }
  }, [evaluationId]);

  const loadPassport = async () => {
    setLoading(true);
    try {
      const data = await api.getPassport(evaluationId);
      setPassport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!passport) return;
    const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bastionloop-passport-${passport.evaluation_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC] font-mono tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#3B82F6]" />
            Test Integrity Passport™ Attestation
          </h2>
          <p className="text-[#8C92A4] text-xs mt-1">
            Cryptographically certified safety report. Anchored by the Merkle root of the immutable evidence ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            disabled={!passport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-bold text-[#60A5FA] hover:text-[#F0F2F6] bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] hover:border-[#2D3342] rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON Attestation
          </button>
          <button
            onClick={loadPassport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold text-white bg-[#2563EB] hover:bg-[#3B82F6] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Attestation
          </button>
        </div>
      </div>

      {loading && !passport ? (
        <div className="p-16 text-center text-xs font-mono text-[#585E70] bg-[#15171F] rounded-2xl border border-[#20242E]">
          <Award className="w-8 h-8 text-[#3B82F6] mx-auto mb-2 animate-bounce" />
          <div className="text-[#F0F2F6]">Synthesizing verifiable Test Integrity Passport...</div>
        </div>
      ) : passport ? (
        <PassportCard passport={passport} onExportJson={handleExportJson} />
      ) : (
        <div className="p-16 text-center text-xs font-mono text-[#585E70] bg-[#15171F] rounded-2xl border border-[#20242E]">
          No passport record found for this evaluation.
        </div>
      )}
    </div>
  );
};
