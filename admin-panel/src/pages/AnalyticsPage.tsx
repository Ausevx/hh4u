import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AnalyticsSummary } from '../types';
import {
  BarChart3,
  TrendingUp,
  Users,
  Search,
  Activity,
  RefreshCw,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.analytics.getSummary();
      setAnalytics(res.analytics);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchAnalytics} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const maxSearches = Math.max(...analytics.searchesPerDay.map(d => d.count), 1);
  const maxTopQ = Math.max(...analytics.topQuestions.map(q => q.count), 1);
  const totalProviderUsers = analytics.usersByProvider.reduce((sum, p) => sum + p.count, 0) || 1;

  const providerColors: Record<string, string> = {
    google: 'bg-blue-500',
    email_otp: 'bg-green-500',
    guest: 'bg-gray-400',
  };

  const providerLabels: Record<string, string> = {
    google: 'Google',
    email_otp: 'Email OTP',
    guest: 'Guest',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={28} /> Analytics Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Usage insights for Healing Hands4U
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <div className="w-11 h-11 rounded-lg bg-teal-500 flex items-center justify-center mb-3">
            <Users size={22} className="text-white" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <div className="w-11 h-11 rounded-lg bg-indigo-500 flex items-center justify-center mb-3">
            <Search size={22} className="text-white" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Searches</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalSearches}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <div className="w-11 h-11 rounded-lg bg-amber-500 flex items-center justify-center mb-3">
            <TrendingUp size={22} className="text-white" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Searches / Day</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.searchesPerDay.length > 0
              ? Math.round(analytics.searchesPerDay.reduce((s, d) => s + d.count, 0) / analytics.searchesPerDay.length)
              : 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Searches Per Day Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Activity size={16} /> Searches Per Day (Last 30 Days)
          </h3>
          {analytics.searchesPerDay.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No search data yet</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {analytics.searchesPerDay.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-teal-500 rounded-t transition-all hover:bg-teal-400 min-h-[2px]"
                    style={{ height: `${(day.count / maxSearches) * 100}%` }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {day.date}: {day.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Breakdown Pie (Horizontal Bar) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Users size={16} /> Users by Auth Provider
          </h3>
          {analytics.usersByProvider.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No user data yet</p>
          ) : (
            <div className="space-y-4">
              {/* Stacked bar */}
              <div className="flex rounded-full overflow-hidden h-6">
                {analytics.usersByProvider.map((p) => (
                  <div
                    key={p.provider}
                    className={`${providerColors[p.provider] || 'bg-gray-400'} transition-all`}
                    style={{ width: `${(p.count / totalProviderUsers) * 100}%` }}
                    title={`${providerLabels[p.provider] || p.provider}: ${p.count}`}
                  />
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4">
                {analytics.usersByProvider.map((p) => (
                  <div key={p.provider} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${providerColors[p.provider] || 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {providerLabels[p.provider] || p.provider}: <strong>{p.count}</strong> ({Math.round((p.count / totalProviderUsers) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Questions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <BarChart3 size={16} /> Top 10 Most Queried Questions
        </h3>
        {analytics.topQuestions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No query data yet</p>
        ) : (
          <div className="space-y-3">
            {analytics.topQuestions.map((q, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-6 text-right">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-900 dark:text-white truncate pr-4">{q.questionText}</p>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {q.count} searches
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all"
                      style={{ width: `${(q.count / maxTopQ) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
