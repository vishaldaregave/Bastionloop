import React from 'react';
import {
  ShieldCheck, Award, CheckCircle2, AlertTriangle,
  Download, Printer, Lock, FileText, QrCode, Cpu, Shield
} from 'lucide-react';
import { TestIntegrityPassport } from '../types';

interface PassportCardProps {
  passport: TestIntegrityPassport;
  onExportJson?: () => void;
}

export const PassportCard: React.FC<PassportCardProps> = ({ passport, onExportJson }) => {
  const handlePrint = () => {
    window.print();
  };

  const isHighTrust = passport.trust_score >= 80;

  return (
    <div className="space-y-4">
      {/* Export & Print Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[#585E70] font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
          OFFICIAL VERIFICATION CERTIFICATE
        </span>
        <div className="flex items-center gap-2">
          {onExportJson && (
            <button
              onClick={onExportJson}
              className="px-3.5 py-1.5 rounded-lg bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] hover:border-[#2D3342] text-xs font-mono text-[#60A5FA] hover:text-[#F0F2F6] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>EXPORT JSON</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#3B82F6] text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT / SAVE PDF</span>
          </button>
        </div>
      </div>

      {/* Main Passport Document */}
      <div className="p-8 rounded-2xl bg-[#15171F] border border-[#2D3342] relative overflow-hidden shadow-sm">
        {/* Watermark Logo */}
        <div className="absolute right-8 top-12 opacity-5 pointer-events-none text-[#3B82F6]">
          <Shield className="w-72 h-72" />
        </div>

        {/* Passport Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#20242E] pb-6 relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-[#191C25] text-[#60A5FA] border border-[#2563EB] font-bold">
                BASTIONLOOP ASSURANCE PASSPORT
              </span>
              <span className="text-[10px] font-mono text-[#10B981] font-bold flex items-center gap-1">
                ✓ CRYPTOGRAPHICALLY ATTESTED
              </span>
            </div>
            <h1 className="text-2xl font-mono font-extrabold text-[#F8FAFC] mt-2 tracking-wide">
              TEST INTEGRITY PASSPORT™
            </h1>
            <p className="text-xs text-[#8C92A4] mt-1">
              Verifiable proof of adversarial evaluation isolation, contamination resistance, and cryptographic provenance.
            </p>
          </div>

          {/* Trust Score Badge */}
          <div className="p-4 rounded-xl bg-[#12141A] border border-[#20242E] text-center min-w-[160px] shadow-inner">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#585E70] font-bold">
              BASTIONLOOP TRUST SCORE
            </span>
            <div className="text-3xl font-mono font-black text-[#F8FAFC] mt-0.5">
              {passport.trust_score}
              <span className="text-sm font-normal text-[#585E70]">/100</span>
            </div>
            <span className={`inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isHighTrust 
                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30' 
                : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
            }`}>
              {passport.trust_tier}
            </span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-b border-[#20242E] text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242E]/60">
            <span className="text-[#585E70] text-[10px] font-bold uppercase tracking-wider">EVALUATION ID</span>
            <div className="text-[#F8FAFC] font-bold mt-1 text-sm">{passport.evaluation_id}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242E]/60">
            <span className="text-[#585E70] text-[10px] font-bold uppercase tracking-wider">TARGET MODEL</span>
            <div className="text-[#3B82F6] font-bold mt-1">{passport.model_identity} (v{passport.model_version})</div>
          </div>
          <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242E]/60">
            <span className="text-[#585E70] text-[10px] font-bold uppercase tracking-wider">TEST SUITE METRICS</span>
            <div className="text-[#F0F2F6] font-medium mt-1">{passport.attack_count} Attacks / {passport.threats_mitigated} Mitigated</div>
          </div>
          <div className="p-3 rounded-lg bg-[#12141A] border border-[#20242E]/60">
            <span className="text-[#585E70] text-[10px] font-bold uppercase tracking-wider">ISSUANCE TIMESTAMP</span>
            <div className="text-[#8C92A4] font-medium mt-1">{new Date(passport.issued_at).toUTCString()}</div>
          </div>
        </div>

        {/* 4 Core Zero-Trust Security Guarantees */}
        <div className="py-6 border-b border-[#20242E] space-y-3">
          <h4 className="text-xs font-mono font-bold text-[#60A5FA] uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
            ZERO-TRUST SECURITY GUARANTEES
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#12141A] border border-[#20242E] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#F0F2F6] font-semibold">ISOLATION BOUNDARY</span>
              </div>
              <span className="text-[#10B981] font-bold">{passport.isolation_status}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12141A] border border-[#20242E] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#F0F2F6] font-semibold">CONTAMINATION STATUS</span>
              </div>
              <span className="text-[#10B981] font-bold">{passport.contamination_status}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12141A] border border-[#20242E] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#F0F2F6] font-semibold">EVIDENCE CHAIN</span>
              </div>
              <span className="text-[#10B981] font-bold">{passport.evidence_chain_status}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12141A] border border-[#20242E] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#F0F2F6] font-semibold">RESOURCE GOVERNOR</span>
              </div>
              <span className="text-[#10B981] font-bold">{passport.resource_fairness_status}</span>
            </div>
          </div>
        </div>

        {/* Residual Risk Disclosure */}
        <div className="py-5 border-b border-[#20242E] space-y-2 text-xs">
          <span className="text-xs font-mono font-bold text-[#F59E0B] flex items-center gap-1.5 uppercase">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
            RESIDUAL RISKS & BOUNDARY LIMITATIONS
          </span>
          <ul className="space-y-1 text-[#8C92A4] font-mono text-[11px] list-disc list-inside bg-[#12141A] p-3 rounded-lg border border-[#20242E]">
            {passport.residual_risks.map((risk, idx) => (
              <li key={idx} className="text-[#8C92A4]">{risk}</li>
            ))}
          </ul>
        </div>

        {/* Cryptographic Attestation Footer */}
        <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono">
          <div className="space-y-1.5">
            <div className="text-[#585E70]">
              EVIDENCE TIP HASH: <span className="text-[#60A5FA] font-medium">{passport.evidence_tip_hash.slice(0, 32)}...</span>
            </div>
            <div className="text-[#585E70]">
              PASSPORT ATTESTATION HASH: <span className="text-[#3B82F6] font-bold">{passport.cryptographic_passport_hash}</span>
            </div>
          </div>
          <div className="text-right text-[#585E70]">
            <div>ATTESTED BY: <span className="text-[#F8FAFC] font-bold">{passport.verified_by}</span></div>
            <div className="text-[#10B981] font-bold mt-0.5">STATUS: VERIFIED & SEALED</div>
          </div>
        </div>
      </div>
    </div>
  );
};
