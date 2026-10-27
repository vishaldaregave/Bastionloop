import React, { useState } from 'react';
import { BookOpen, Search, Filter, Plus, CheckCircle2, ShieldAlert, Code, Zap } from 'lucide-react';

interface TestLibraryPageProps {
  evaluationId: string;
}

export const TestLibraryPage: React.FC<TestLibraryPageProps> = ({ evaluationId }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const testCases = [
    { id: 'TC-INJ-001', name: 'Direct System Prompt Extraction', category: 'Prompt Injection', severity: 'CRITICAL', version: 'v2.1', property: 'System confidentiality & instruction secrecy', status: 'READY' },
    { id: 'TC-INJ-002', name: 'Role Confusion & Persona Usurpation', category: 'Role Confusion', severity: 'HIGH', version: 'v1.8', property: 'Role boundary integrity', status: 'READY' },
    { id: 'TC-DEL-001', name: 'Delimiter Override & Fake Assistant Egress', category: 'Delimiter Override', severity: 'HIGH', version: 'v2.0', property: 'Structural delimiter immunity', status: 'READY' },
    { id: 'TC-CAN-001', name: 'Synthetic Canary Extraction via JSON Schema', category: 'Canary Trap', severity: 'CRITICAL', version: 'v2.4', property: 'Zero canary token leakage in responses', status: 'READY' },
    { id: 'TC-EXF-001', name: 'Database Credential Exfiltration Probe', category: 'Data Disclosure', severity: 'HIGH', version: 'v1.5', property: 'Credential redaction & zero exposure', status: 'READY' },
    { id: 'TC-DAN-001', name: 'DAN / Jailbreak Persona Hijack', category: 'Jailbreak', severity: 'CRITICAL', version: 'v3.0', property: 'Refusal preservation under adversarial pressure', status: 'READY' },
    { id: 'TC-CTX-001', name: 'Context Window Overflow Manipulation', category: 'Context Hijack', severity: 'MEDIUM', version: 'v1.2', property: 'Context memory isolation across turns', status: 'READY' }
  ];

  const filteredTests = testCases.filter((tc) => {
    const matchesCat = selectedCategory === 'ALL' || tc.category === selectedCategory;
    const matchesSearch = search === '' ||
      tc.name.toLowerCase().includes(search.toLowerCase()) ||
      tc.id.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans text-[#F0F2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#EF4444]" />
            Adversarial Test Case Library
          </h1>
          <p className="text-[#585E70] text-xs mt-1">
            Curated repository of standardized safety probes, zero-day jailbreaks, and prompt injection vectors.
          </p>
        </div>

        <button
          onClick={() => window.open('/red-team/playground', '_self')}
          className="px-4 py-2 rounded-lg bg-[#15171F] hover:bg-[#191C25] border border-[#EF4444] text-[#F87171] hover:text-[#F8FAFC] text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          Author New Test Vector
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#15171F] p-5 rounded-xl border border-[#20242E] shadow-card flex flex-col md:flex-row gap-4 justify-between items-center font-mono">
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Search className="w-4 h-4 text-[#585E70]" />
          <input
            type="text"
            placeholder="Search test vectors or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-[#12141A] border border-[#20242E] rounded-lg px-3.5 py-2 text-[#F8FAFC] focus:outline-none focus:border-[#EF4444] w-full md:w-80"
          />
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <span className="text-[#585E70]">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#12141A] border border-[#20242E] rounded-lg px-3 py-1.5 text-[#F8FAFC] focus:outline-none focus:border-[#EF4444] cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Prompt Injection">Prompt Injection</option>
            <option value="Canary Trap">Canary Trap</option>
            <option value="Jailbreak">Jailbreak</option>
            <option value="Role Confusion">Role Confusion</option>
          </select>
        </div>
      </div>

      {/* Table of Vectors */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card overflow-hidden font-mono">
        <div className="p-4 bg-[#12141A] border-b border-[#20242E] font-bold text-[#F8FAFC] text-xs flex items-center justify-between">
          <span>Standardized Test Vectors ({filteredTests.length})</span>
          <span className="text-[11px] text-[#10B981]">Validated against Llama 3.2</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#101217] text-[#585E70] text-[10px] uppercase border-b border-[#20242E]">
              <tr>
                <th className="px-5 py-3">TEST ID</th>
                <th className="px-5 py-3">VECTOR DESIGNATION</th>
                <th className="px-5 py-3">CATEGORY</th>
                <th className="px-5 py-3">SEVERITY</th>
                <th className="px-5 py-3">EXPECTED PROPERTY</th>
                <th className="px-5 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#20242E]">
              {filteredTests.map((tc) => (
                <tr key={tc.id} className="hover:bg-[#191C25]/50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#3B82F6]">{tc.id}</td>
                  <td className="px-5 py-3.5 font-semibold text-[#F8FAFC]">
                    {tc.name}
                    <span className="block text-[10px] text-[#585E70] font-normal mt-0.5">rev {tc.version}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[#8C92A4]">{tc.category}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tc.severity === 'CRITICAL' ? 'bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/30' :
                      tc.severity === 'HIGH' ? 'bg-[#2B1D08] text-[#F59E0B] border border-[#F59E0B]/30' :
                      'bg-[#1E222D] text-[#3B82F6] border border-[#2D3342]/30'
                    }`}>
                      {tc.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#585E70] text-xs max-w-xs">{tc.property}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => window.open('/red-team/playground', '_self')}
                      className="px-3 py-1.5 rounded-lg bg-[#12141A] hover:bg-[#EF4444] hover:text-white border border-[#20242E] hover:border-[#EF4444] text-[#3B82F6] text-xs font-bold transition-all cursor-pointer"
                    >
                      Test in Lab →
                    </button>
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
