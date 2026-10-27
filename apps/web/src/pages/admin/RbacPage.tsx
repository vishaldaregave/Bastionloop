import React from 'react';
import { Key, Check, X, Shield, Lock, Info } from 'lucide-react';

export const RbacPage: React.FC = () => {
  const capabilities = [
    { cap: 'red:execute', label: 'Submit Attack Probes / Campaigns', desc: 'Execute adversarial inputs against evaluation targets' },
    { cap: 'red:read_library', label: 'Access Adversarial Test Library', desc: 'Inspect OWASP LLM and specialized prompt vectors' },
    { cap: 'red:read_confidential_payload', label: 'Inspect Raw Red Team Exploit Payloads', desc: 'Access unredacted attack strings' },
    { cap: 'blue:read_sanitized_results', label: 'View Sanitized Security Telemetry', desc: 'Real-time alert queue with redacted vectors' },
    { cap: 'blue:write_defense', label: 'Create & Modify Defense Policies', desc: 'Author regex, instruction fences, and canary traps' },
    { cap: 'blue:test_defense', label: 'Execute Policy Regression Simulator', desc: 'Benchmark candidate defenses against test cases' },
    { cap: 'blue:request_disclosure', label: 'Request Audited Payload Disclosure', desc: 'Submit cryptographic reveal requests for RCAs' },
    { cap: 'model:operate', label: 'Direct Model Inference Playground', desc: 'Interactive prompt engineering and session resets' },
    { cap: 'model:check_contamination', label: 'Run Canary Contamination Checks', desc: 'Inject and verify session boundary markers' },
    { cap: 'eval:create', label: 'Create & Initialize Evaluations', desc: 'Spin up new evaluation sandboxes and target LLMs' },
    { cap: 'eval:control', label: 'Lifecycle Controls (Pause/Resume/Stop)', desc: 'Manage evaluation execution states' },
    { cap: 'evidence:verify', label: 'Verify Merkle Evidence Root', desc: 'Recompute cryptographic hash chains' },
    { cap: 'admin:manage_users', label: 'Provision Users & Assign Roles', desc: 'Platform account governance' },
  ];

  const roles = [
    {
      role: 'ADMIN',
      label: 'Administrator',
      color: '#3B82F6',
      caps: ['red:execute', 'red:read_library', 'red:read_confidential_payload', 'blue:read_sanitized_results', 'blue:write_defense', 'blue:test_defense', 'blue:request_disclosure', 'model:operate', 'model:check_contamination', 'eval:create', 'eval:control', 'evidence:verify', 'admin:manage_users']
    },
    {
      role: 'RED_TEAM',
      label: 'Red Team',
      color: '#EF4444',
      caps: ['red:execute', 'red:read_library', 'red:read_confidential_payload', 'model:operate', 'evidence:verify']
    },
    {
      role: 'BLUE_TEAM',
      label: 'Blue Team',
      color: '#10B981',
      caps: ['blue:read_sanitized_results', 'blue:write_defense', 'blue:test_defense', 'blue:request_disclosure', 'evidence:verify']
    },
    {
      role: 'MODEL_OPERATOR',
      label: 'Model Operator',
      color: '#6366F1',
      caps: ['model:operate', 'model:check_contamination', 'evidence:verify']
    },
    {
      role: 'AUDITOR',
      label: 'Auditor',
      color: '#60A5FA',
      caps: ['blue:read_sanitized_results', 'evidence:verify']
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Roles & Capability Matrix</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Server-enforced cryptographic authorization matrix. Every API endpoint enforces mandatory capability verification.
          </p>
        </div>
      </div>

      {/* Security Architecture Guarantee */}
      <div className="bg-[#15171F] border border-[#2D3342] p-4 rounded-xl flex items-start gap-3 shadow-sm">
        <Lock className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
        <div className="text-xs text-[#8C92A4] leading-relaxed">
          <span className="font-bold text-[#F0F2F6]">Cryptographic Server Enforcement:</span> Client-side role variables cannot elevate privileges. The FastAPI gateway cryptographically parses the JWT signature and enforces explicit capability checks on every single HTTP and WebSocket route.
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#191C24] font-semibold text-[#F8FAFC] text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#3B82F6]" />
            Granular Permission Matrix
          </span>
          <span className="text-xs text-[#585E70] font-mono">13 Core Capabilities</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#141720] text-[#585E70] font-mono font-bold text-[10px] uppercase border-b border-[#20242E]">
                <th className="py-3 px-4 min-w-[280px]">Permission / Capability</th>
                {roles.map(r => (
                  <th key={r.role} className="py-3 px-4 text-center font-bold" style={{ color: r.color }}>
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#191C24] font-mono">
              {capabilities.map((c) => (
                <tr key={c.cap} className="hover:bg-[#1D212C]/40 transition-colors">
                  <td className="py-3.5 px-4 font-sans">
                    <div className="font-bold text-[#F8FAFC] text-xs">{c.label}</div>
                    <div className="font-mono text-[11px] text-[#60A5FA] font-medium mt-0.5">{c.cap}</div>
                    <div className="text-[11px] text-[#585E70] mt-0.5">{c.desc}</div>
                  </td>
                  {roles.map(r => {
                    const hasCap = r.caps.includes(c.cap);
                    return (
                      <td key={r.role} className="py-3.5 px-4 text-center">
                        {hasCap ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#0D2820] text-[#10B981] border border-[#10B981]/40 rounded-full font-bold shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-[#12141A] text-[#52657A] border border-[#20242E] rounded-full">
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
