import React, { useState } from 'react';
import {
  Settings, Save, RotateCcw, Shield, Lock, Server,
  Sliders, AlertTriangle, CheckCircle2, Key, Database, Cpu
} from 'lucide-react';

export const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    // Platform Governance
    platformName: 'BastionLoop AI Security Laboratory',
    environment: 'PRODUCTION_AIRGAPPED',
    merkleLedgerEnforcement: true,
    strictIsolationVerification: true,
    
    // Auth & Session Management
    jwtSessionLifetimeMinutes: 60,
    mfaRequired: true,
    maxFailedLogins: 5,
    passwordPolicyComplexity: 'HIGH_ENTROPY',

    // Rate Limiting & Resource Quotas
    globalRateLimitReqPerMin: 60,
    maxConcurrentCampaigns: 4,
    sandboxTimeoutSeconds: 300,
    fairnessShareTolerance: 0.15,

    // Provider & Telemetry
    ollamaBaseUrl: 'http://llm_sandbox:11434',
    enableDetailedInferenceAudit: true,
    telemetryRetentionDays: 90,
  });

  const [saved, setSaved] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const confirmSave = () => {
    setShowConfirmModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F8FAFC] font-mono tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#3B82F6]" />
            System & Security Governance Settings
          </h2>
          <p className="text-[#8C92A4] text-xs mt-1">
            Global security perimeter policies, session governance, and cryptographic ledger parameters.
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            Governance settings committed
          </div>
        )}
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Platform & Ledger Architecture */}
        <div className="p-6 rounded-2xl bg-[#15171F] border border-[#20242E] shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-[#20242E] pb-3">
            <Shield className="w-4 h-4 text-[#3B82F6]" />
            <h3 className="text-sm font-mono font-bold text-[#F8FAFC] uppercase tracking-wider">
              Platform & Root-of-Trust Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-[#585E70] font-semibold mb-1">PLATFORM DESIGNATION</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F0F2F6] focus:outline-none focus:border-[#2D3342]"
              />
            </div>

            <div>
              <label className="block text-[#585E70] font-semibold mb-1">OPERATING ENVIRONMENT</label>
              <select
                value={settings.environment}
                onChange={(e) => setSettings({ ...settings, environment: e.target.value })}
                className="w-full bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F0F2F6] focus:outline-none focus:border-[#2D3342]"
              >
                <option value="PRODUCTION_AIRGAPPED">PRODUCTION_AIRGAPPED (Isolated Subnets)</option>
                <option value="STAGING_HARDENED">STAGING_HARDENED</option>
                <option value="LAB_DEVELOPMENT">LAB_DEVELOPMENT</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#12141A] border border-[#20242E]">
              <div>
                <div className="text-[#F0F2F6] font-semibold">Strict Merkle Ledger Enforcement</div>
                <div className="text-[11px] text-[#585E70]">Reject evidence entries failing SHA-256 parent hash links</div>
              </div>
              <input
                type="checkbox"
                checked={settings.merkleLedgerEnforcement}
                onChange={(e) => setSettings({ ...settings, merkleLedgerEnforcement: e.target.checked })}
                className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#12141A] border border-[#20242E]">
              <div>
                <div className="text-[#F0F2F6] font-semibold">Strict Isolation Verification</div>
                <div className="text-[11px] text-[#585E70]">Block campaign execution if direct red→blue routes exist</div>
              </div>
              <input
                type="checkbox"
                checked={settings.strictIsolationVerification}
                onChange={(e) => setSettings({ ...settings, strictIsolationVerification: e.target.checked })}
                className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Authentication & RBAC Governance */}
        <div className="p-6 rounded-2xl bg-[#15171F] border border-[#20242E] shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-[#20242E] pb-3">
            <Lock className="w-4 h-4 text-[#3B82F6]" />
            <h3 className="text-sm font-mono font-bold text-[#F8FAFC] uppercase tracking-wider">
              Authentication & Session Security
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-[#585E70] font-semibold mb-1">JWT ACCESS TOKEN LIFETIME (MINUTES)</label>
              <input
                type="number"
                min="5"
                max="1440"
                value={settings.jwtSessionLifetimeMinutes}
                onChange={(e) => setSettings({ ...settings, jwtSessionLifetimeMinutes: parseInt(e.target.value) || 60 })}
                className="w-full bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F0F2F6] focus:outline-none focus:border-[#2D3342]"
              />
            </div>

            <div>
              <label className="block text-[#585E70] font-semibold mb-1">MAX FAILED LOGIN ATTEMPTS BEFORE LOCK</label>
              <input
                type="number"
                min="3"
                max="10"
                value={settings.maxFailedLogins}
                onChange={(e) => setSettings({ ...settings, maxFailedLogins: parseInt(e.target.value) || 5 })}
                className="w-full bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F0F2F6] focus:outline-none focus:border-[#2D3342]"
              />
            </div>

            <div>
              <label className="block text-[#585E70] font-semibold mb-1">SIGNING KEY DERIVATION ALGORITHM</label>
              <input
                type="text"
                disabled
                value="HS256 (HMAC-SHA256 Protected by Server Vault)"
                className="w-full bg-[#12141A]/60 border border-[#20242E] rounded-lg px-3.5 py-2 text-[#585E70] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[#585E70] font-semibold mb-1">PASSWORD ENTROPY STANDARD</label>
              <input
                type="text"
                disabled
                value="NIST SP 800-63B Compliant (Argon2id/Bcrypt)"
                className="w-full bg-[#12141A]/60 border border-[#20242E] rounded-lg px-3.5 py-2 text-[#585E70] cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Resource Governance & Fairness Quotas */}
        <div className="p-6 rounded-2xl bg-[#15171F] border border-[#20242E] shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-[#20242E] pb-3">
            <Sliders className="w-4 h-4 text-[#3B82F6]" />
            <h3 className="text-sm font-mono font-bold text-[#F8FAFC] uppercase tracking-wider">
              Resource Governor & Rate Limits
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-[#585E70] font-semibold mb-1">GLOBAL RATE LIMIT (REQ / MIN)</label>
              <input
                type="number"
                min="10"
                max="600"
                value={settings.globalRateLimitReqPerMin}
                onChange={(e) => setSettings({ ...settings, globalRateLimitReqPerMin: parseInt(e.target.value) || 60 })}
                className="w-full bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F0F2F6] focus:outline-none focus:border-[#2D3342]"
              />
            </div>

            <div>
              <label className="block text-[#585E70] font-semibold mb-1">MAX CONCURRENT EVALUATIONS</label>
              <input
                type="number"
                min="1"
                max="16"
                value={settings.maxConcurrentCampaigns}
                onChange={(e) => setSettings({ ...settings, maxConcurrentCampaigns: parseInt(e.target.value) || 4 })}
                className="w-full bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F0F2F6] focus:outline-none focus:border-[#2D3342]"
              />
            </div>

            <div>
              <label className="block text-[#585E70] font-semibold mb-1">SANDBOX RUNTIME TIMEOUT (SECONDS)</label>
              <input
                type="number"
                min="60"
                max="1800"
                value={settings.sandboxTimeoutSeconds}
                onChange={(e) => setSettings({ ...settings, sandboxTimeoutSeconds: parseInt(e.target.value) || 300 })}
                className="w-full bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F0F2F6] focus:outline-none focus:border-[#2D3342]"
              />
            </div>

            <div>
              <label className="block text-[#585E70] font-semibold mb-1">DOMINANT RESOURCE FAIRNESS TOLERANCE</label>
              <input
                type="number"
                step="0.01"
                min="0.05"
                max="0.5"
                value={settings.fairnessShareTolerance}
                onChange={(e) => setSettings({ ...settings, fairnessShareTolerance: parseFloat(e.target.value) || 0.15 })}
                className="w-full bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F0F2F6] focus:outline-none focus:border-[#2D3342]"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-mono font-bold text-[#585E70] hover:text-[#F0F2F6] bg-[#15171F] hover:bg-[#191C25] border border-[#20242E] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Discard Changes
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-mono font-bold text-white bg-[#2563EB] hover:bg-[#3B82F6] rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Security Policy Changes
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-[#0C0D11]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#15171F] border border-[#2D3342] p-6 rounded-2xl max-w-md w-full shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-[#F59E0B]">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-sm font-mono font-bold text-[#F8FAFC]">Confirm Policy Update</h4>
            </div>
            <p className="text-xs font-mono text-[#8C92A4] leading-relaxed">
              Applying new system governance parameters will update active sandbox enforcement policies and rate limit thresholds.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs font-mono font-bold text-[#585E70] hover:text-[#F0F2F6] bg-[#12141A] border border-[#20242E] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                className="px-4 py-1.5 text-xs font-mono font-bold text-white bg-[#2563EB] hover:bg-[#3B82F6] rounded-lg shadow-md shadow-blue-500/30"
              >
                Confirm & Commit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
