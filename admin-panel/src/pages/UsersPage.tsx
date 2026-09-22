import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { AppUser, UserDetail } from '../types';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  User,
  Shield,
  Clock,
  MessageCircle,
  Filter,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [authFilter, setAuthFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const limit = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.users.list({ search, page, limit, authProvider: authFilter || undefined });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, page, authFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openUserDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.users.getById(userId);
      setSelectedUser(res.user);
    } catch (err) {
      console.error('Failed to fetch user detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const providerBadge = (provider: string) => {
    const styles: Record<string, string> = {
      google: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      email_otp: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      guest: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    const labels: Record<string, string> = {
      google: 'Google',
      email_otp: 'Email OTP',
      guest: 'Guest',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[provider] || styles.guest}`}>
        {labels[provider] || provider}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users size={28} /> App Users
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {total} total users registered
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: total, color: 'bg-teal-500' },
          { label: 'Google Users', value: users.filter(u => u.authProvider === 'google').length, color: 'bg-blue-500' },
          { label: 'Email OTP', value: users.filter(u => u.authProvider === 'email_otp').length, color: 'bg-green-500' },
          { label: 'Guest Users', value: users.filter(u => u.authProvider === 'guest').length, color: 'bg-gray-500' },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <User size={20} className="text-white" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={authFilter}
            onChange={(e) => { setAuthFilter(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
          >
            <option value="">All Providers</option>
            <option value="google">Google</option>
            <option value="email_otp">Email OTP</option>
            <option value="guest">Guest</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Auth Provider</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Queries</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => openUserDetail(user.id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                        <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                          {(user.displayName || user.email || 'G')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.displayName || 'Guest User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email || 'No email'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{providerBadge(user.authProvider)}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.queryCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(user.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                  <span className="text-xl font-bold text-teal-700 dark:text-teal-300">
                    {(selectedUser.displayName || selectedUser.email || 'G')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedUser.displayName || 'Guest User'}
                  </p>
                  {providerBadge(selectedUser.authProvider)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">{selectedUser.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle size={14} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">{selectedUser.queryCount || 0} queries</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">Joined {formatDate(selectedUser.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield size={14} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">Last login {formatDate(selectedUser.lastLoginAt)}</span>
                </div>
              </div>

              {/* Recent Sessions */}
              {selectedUser.recentSessions && selectedUser.recentSessions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent Queries</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedUser.recentSessions.map((session) => (
                      <div key={session.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                        <MessageCircle size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white truncate">{session.queryText}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {session.intent} · {session.matchConfident ? '✓ Matched' : '✗ Fallback'} · {formatDate(session.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl">
            <p className="text-gray-600 dark:text-gray-300">Loading user details...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
