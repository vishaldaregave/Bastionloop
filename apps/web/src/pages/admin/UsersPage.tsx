import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, CheckCircle2, XCircle, RefreshCw, Key, Mail, Search, Lock, X } from 'lucide-react';
import { api } from '../../services/api';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'RED_TEAM'
  });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await api.listUsers();
      setUsers(list);
    } catch (err: any) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setStatusMsg(`User '${newUser.username}' provisioned with cryptographic credentials.`);
      setShowCreateModal(false);
      setNewUser({ username: '', email: '', password: '', role: 'RED_TEAM' });
      await loadUsers();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(`Error creating user: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(u =>
    searchQuery === '' ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Users & Teams Governance</h1>
          <p className="text-[#585E70] text-xs mt-1">
            Provision user accounts, assign cryptographic RBAC roles, and manage active session authorizations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#3B82F6] text-white text-xs font-mono font-bold rounded-lg transition-all shadow-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Provision New User
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-[#15171F] border border-[#10B981] text-[#10B981] text-xs rounded-xl font-mono font-semibold flex items-center justify-between shadow-sm">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-[#585E70] hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#15171F] p-4 rounded-xl border border-[#20242E] shadow-card flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 w-full md:w-80">
          <Search className="w-4 h-4 text-[#585E70]" />
          <input
            type="text"
            placeholder="Search users by username, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-[#12141A] border border-[#20242E] rounded-lg px-3 py-2 text-[#F0F2F6] placeholder-[#585E70] focus:outline-none focus:border-[#2D3342]"
          />
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#60A5FA] hover:text-[#F0F2F6] bg-[#12141A] border border-[#20242E] rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Roster
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#15171F] rounded-xl border border-[#20242E] shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#191C24] font-semibold text-[#F8FAFC] text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3B82F6]" />
            Provisioned Accounts ({filteredUsers.length})
          </span>
          <span className="text-xs text-[#585E70] font-mono">Server-Enforced RBAC</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#585E70] text-xs font-mono">Loading user roster...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-[#585E70] text-xs font-mono">No matching users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#141720] text-[#585E70] font-mono font-bold text-[10px] uppercase border-b border-[#20242E]">
                  <th className="py-3 px-4">Operator Account</th>
                  <th className="py-3 px-4">Role Assignment</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Subject Identifier</th>
                  <th className="py-3 px-4 text-right">Provisioned At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#191C24] font-mono">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-[#1D212C]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#F8FAFC]">{u.username}</div>
                      <div className="text-[11px] text-[#585E70] flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-[#60A5FA]" /> {u.email || `${u.username}@bastionloop.internal`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded uppercase ${
                        u.role === 'ADMIN' ? 'bg-[#191C25] text-[#60A5FA] border border-[#2563EB]' :
                        u.role === 'RED_TEAM' ? 'bg-[#2D1217] text-[#EF4444] border border-[#EF4444]/40' :
                        u.role === 'BLUE_TEAM' ? 'bg-[#0D2820] text-[#10B981] border border-[#10B981]/40' :
                        u.role === 'MODEL_OPERATOR' ? 'bg-[#1E1B38] text-[#6366F1] border border-[#6366F1]/40' :
                        'bg-[#12141A] text-[#8C92A4] border border-[#20242E]'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-[#10B981] font-semibold text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#60A5FA] text-[11px]">
                      {u.id}
                    </td>
                    <td className="py-3 px-4 text-right text-[#585E70] text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'System Boot'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0C0D11]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#15171F] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#2D3342] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#20242E]">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#3B82F6]" />
                Provision User Account
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#585E70] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sec_tester_01"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] placeholder-[#585E70] focus:border-[#2D3342]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="user@organization.com"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] placeholder-[#585E70] focus:border-[#2D3342]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] placeholder-[#585E70] focus:border-[#2D3342]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8C92A4] uppercase tracking-wider block mb-1 font-mono">
                  Platform Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full text-xs font-mono bg-[#12141A] border border-[#20242E] rounded-lg p-2.5 text-[#F0F2F6] font-semibold focus:border-[#2D3342]"
                >
                  <option value="RED_TEAM">RED_TEAM (Offensive Testing Operator)</option>
                  <option value="BLUE_TEAM">BLUE_TEAM (Defensive Guardrail Operator)</option>
                  <option value="MODEL_OPERATOR">MODEL_OPERATOR (Target LLM Laboratory)</option>
                  <option value="AUDITOR">AUDITOR (Read-Only Independent Verifier)</option>
                  <option value="ADMIN">ADMIN (Platform Control Plane)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#8C92A4] bg-[#12141A] border border-[#20242E] rounded-lg hover:bg-[#1D212C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#3B82F6] rounded-lg shadow-sm cursor-pointer"
                >
                  Create & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
