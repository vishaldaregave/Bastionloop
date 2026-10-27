import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, X, Eye, KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { AttackPayload, Role } from '../types';

interface PayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId: string;
  attackId: string;
  currentRole: Role;
}

export const PayloadModal: React.FC<PayloadModalProps> = ({
  isOpen,
  onClose,
  evaluationId,
  attackId,
  currentRole,
}) => {
  const [payload, setPayload] = useState<AttackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && attackId) {
      loadPayload();
    } else {
      setPayload(null);
      setError(null);
    }
  }, [isOpen, attackId, currentRole]);

  const loadPayload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getConfidentialPayload(evaluationId, attackId);
      setPayload(data);
    } catch (err: any) {
      setError(err.message || 'Access Denied: Lacks red:read_payload capability');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 relative shadow-elevated space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-mono font-bold text-slate-900 uppercase">
              CONFIDENTIAL ATTACK PAYLOAD
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Control Notice */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">REQUESTING ACTOR:</span>
            <span className={`font-bold ${currentRole === 'RED_TEAM' || currentRole === 'ADMIN' ? 'text-emerald-700' : 'text-red-600'}`}>
              {currentRole}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">REQUIRED CAPABILITY:</span>
            <span className="text-amber-700 font-bold">red:read_payload</span>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            Authenticating capability token...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-mono text-red-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-700">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>ZERO-TRUST POLICY VIOLATION</span>
            </div>
            <p className="text-[11px] leading-relaxed text-red-700">
              {error}
            </p>
            <p className="text-[10px] text-red-600 pt-1 border-t border-red-200">
              Blue Team and Viewer roles are strictly prohibited from viewing raw confidential Red Team payloads prior to authorized disclosure.
            </p>
          </div>
        ) : payload ? (
          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] font-semibold">PAYLOAD ID:</span>
              <div className="text-slate-900 font-bold">{payload.id}</div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-semibold">RAW ADVERSARIAL PROMPT:</span>
              <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {payload.prompt_text}
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100">
              <span>SHA-256 HASH:</span>
              <span className="text-emerald-700 font-bold">{payload.payload_hash}</span>
            </div>
          </div>
        ) : null}

        {/* Close Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-800 font-semibold transition-all cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
