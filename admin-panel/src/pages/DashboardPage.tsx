import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { KPIStats, KnowledgeBaseItem } from '../types';
import KnowledgeModal from '../components/KnowledgeModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import BulkUploadModal from '../components/BulkUploadModal';
import {
  Activity,
  BookOpen,
  GitBranch,
  Pill,
  Database,
  Search,
  Plus,
  Upload,
  LogOut,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Video,
  ExternalLink,
  RotateCw,
  HelpCircle,
  X,
  Download,
  Info,
  Moon,
  Sun,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { admin, logout } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Stats State
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Table & Filter State
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  // Row Expansion State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modal States
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [knowledgeModalMode, setKnowledgeModalMode] = useState<'create' | 'edit'>('create');
  const [selectedKnowledgeItem, setSelectedKnowledgeItem] = useState<KnowledgeBaseItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBaseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Debounce search query by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load KPI Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.stats.get();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load Knowledge Base Items
  const fetchItems = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.knowledgeBase.list({
        search: debouncedSearch,
        page: currentPage,
        limit: pageSize,
      });
      if (res.success) {
        setItems(res.items);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge base items:', err);
    } finally {
      setTableLoading(false);
    }
  }, [debouncedSearch, currentPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchItems();
  };

  const handleOpenCreateModal = () => {
    setSelectedKnowledgeItem(null);
    setKnowledgeModalMode('create');
    setIsKnowledgeModalOpen(true);
  };

  const handleOpenEditModal = (item: KnowledgeBaseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKnowledgeItem(item);
    setKnowledgeModalMode('edit');
    setIsKnowledgeModalOpen(true);
  };

  const handleOpenDeleteModal = (item: KnowledgeBaseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.knowledgeBase.delete(itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchStats();
      fetchItems();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  // Helper to extract YouTube video ID
  const getYouTubeId = (url?: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col text-black dark:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base text-black dark:text-white leading-tight">Healing Hands4U</h1>
                <span className="bg-gray-100 dark:bg-gray-900 text-black dark:text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Admin Portal
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Knowledge Base Management & Vector Sync</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Header APK Download Button with Hover Tooltip & Title */}
            <div className="relative group inline-block">
              <a
                href="/healing-hands-4u.apk"
                download
                title="This APK connects to the live backend. Database changes via upload take effect immediately — no APK rebuild needed."
                className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold text-black dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Download APK</span>
              </a>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:flex items-start space-x-2 z-50 w-72 p-2.5 text-xs text-white bg-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-xl shadow-xl border border-gray-700 pointer-events-none transition-opacity duration-150">
                <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">
                  This APK connects to the live backend. Database changes via upload take effect immediately — no APK rebuild needed.
                </span>
              </div>
            </div>

            <a
              href="/users"
              className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold text-black dark:text-white bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors shadow-sm cursor-pointer"
            >
              <span className="hidden sm:inline">👥 Users</span>
              <span className="sm:hidden">👥</span>
            </a>

            <a
              href="/analytics"
              className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold text-black dark:text-white bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors shadow-sm cursor-pointer"
            >
              <span className="hidden sm:inline">📊 Analytics</span>
              <span className="sm:hidden">📊</span>
            </a>

            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold text-black dark:text-white bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-black dark:text-white sm:mr-1.5" />
              <span className="hidden sm:inline">Bulk Import (.xlsx)</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-2 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Add Knowledge Entry</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-black dark:text-white">{admin?.email}</p>
                <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wider">{admin?.role || 'Admin'}</p>
              </div>
              <button
                onClick={toggleDarkMode}
                title="Toggle Theme"
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Android Live Backend Sync Informational Banner */}
        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Android Mobile App (Live Backend Sync)
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                This APK connects to the live backend. Database changes via upload take effect immediately — no APK rebuild needed.
              </p>
            </div>
          </div>
          <a
            href="/healing-hands-4u.apk"
            download
            className="inline-flex items-center px-3.5 py-2 border border-sky-300 dark:border-sky-700 rounded-xl text-xs font-semibold text-sky-900 dark:text-sky-200 bg-white dark:bg-sky-900/40 hover:bg-sky-100 dark:hover:bg-sky-900/70 transition-colors shadow-xs flex-shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Download APK</span>
          </a>
        </div>

        {/* KPI Stat Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Questions */}
          <div className="bg-white dark:bg-black p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-black dark:text-white flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Level 1 Questions</p>
              <p className="text-2xl font-bold text-black dark:text-white">
                {statsLoading ? '...' : stats?.totalQuestions ?? 0}
              </p>
              <p className="text-[11px] text-gray-800 dark:text-gray-200 font-medium mt-0.5">
                {stats?.activeQuestions ?? 0} Active in App
              </p>
            </div>
          </div>

          {/* Card 2: Consultations */}
          <div className="bg-white dark:bg-black p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-black dark:text-white flex-shrink-0">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Diagnostic Trees</p>
              <p className="text-2xl font-bold text-black dark:text-white">
                {statsLoading ? '...' : stats?.totalConsultations ?? 0}
              </p>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium mt-0.5">Yes/No Logic Branches</p>
            </div>
          </div>

          {/* Card 3: Answers & Remedies */}
          <div className="bg-white dark:bg-black p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-800 dark:text-gray-200 flex-shrink-0">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Remedies & Answers</p>
              <p className="text-2xl font-bold text-black dark:text-white">
                {statsLoading ? '...' : stats?.totalAnswers ?? 0}
              </p>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium mt-0.5">Homeopathic Guidance</p>
            </div>
          </div>

          {/* Card 4: Vector Index Status */}
          <div className="bg-white dark:bg-black p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-black dark:text-white flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Atlas Vector Search</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${stats?.vectorIndexActive ? 'bg-black dark:bg-white animate-pulse' : 'bg-gray-500 dark:bg-gray-400'}`} />
                <p className="text-sm font-bold text-black dark:text-white">
                  {statsLoading ? '...' : stats?.vectorIndexActive ? 'Index Active' : 'Fallback Cosine'}
                </p>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium mt-0.5">1536-dim Cosine Embeddings</p>
            </div>
          </div>
        </section>

        {/* Knowledge Base Table Card */}
        <section className="bg-white dark:bg-black rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm overflow-hidden">
          {/* Table Controls Header */}
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, tags, remedies, diagnostic criteria..."
                className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
              <span>
                Showing <strong className="text-black dark:text-white">{items.length}</strong> of{' '}
                <strong className="text-black dark:text-white">{totalItems}</strong> entries
              </span>
              <button
                onClick={handleRefreshAll}
                title="Refresh Table"
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 dark:bg-gray-900/75 border-b border-gray-200/80 dark:border-gray-800/80 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Canonical Health Question</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Diagnostics</th>
                  <th className="py-3 px-4">Media</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tableLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-600 dark:text-gray-400">
                      <div className="inline-flex flex-col items-center space-y-2">
                        <RotateCw className="w-6 h-6 animate-spin text-black dark:text-white" />
                        <span>Loading Knowledge Base records...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-600 dark:text-gray-400">
                      <div className="inline-flex flex-col items-center space-y-2">
                        <HelpCircle className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        <span className="font-medium text-sm text-black dark:text-white">No knowledge base items found</span>
                        <span className="text-xs">Try adjusting your search query or add a new entry.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isExpanded = expandedRowId === item.id;
                    const diagnosticList =
                      item.diagnosticQuestions ||
                      item.consultationQuery?.diagnosticQuestions.map((dq) => dq.questionText) ||
                      [];
                    const hasVideo = !!item.videoUrl || !!item.answer?.videoUrl;
                    const youtubeId = getYouTubeId(item.videoUrl || item.answer?.videoUrl);

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => toggleRowExpand(item.id)}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-gray-50/80 dark:bg-black/80' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-gray-400 dark:text-gray-500">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-black dark:text-white" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-black dark:text-white max-w-md">
                            <span className="line-clamp-2">{item.canonicalQuestionText}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.tags && item.tags.length > 0 ? (
                                item.tags.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md text-[10px] font-medium"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-[11px]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="bg-gray-100 dark:bg-gray-900 text-black dark:text-white font-semibold px-2 py-0.5 rounded-full text-[10px]">
                              {diagnosticList.length} Steps
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {hasVideo ? (
                              <span className="inline-flex items-center text-black dark:text-white font-medium text-[11px]">
                                <Video className="w-3.5 h-3.5 mr-1" />
                                Video
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.isActive
                                  ? 'bg-gray-100 dark:bg-gray-900 text-black dark:text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1">
                              <button
                                onClick={(e) => handleOpenEditModal(item, e)}
                                title="Edit Question"
                                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleOpenDeleteModal(item, e)}
                                title="Delete Question"
                                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Accordion Row Details */}
                        {isExpanded && (
                          <tr className="bg-gray-50/40 dark:bg-black/40">
                            <td colSpan={7} className="p-4 sm:p-6 border-y border-gray-200 dark:border-gray-800">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white dark:bg-black p-5 rounded-xl border border-gray-200/70 dark:border-gray-800/70 shadow-sm">
                                {/* Col 1: Diagnostic Questions Tree */}
                                <div className="space-y-3">
                                   <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                                    <GitBranch className="w-4 h-4" />
                                    <span>Diagnostic Questions</span>
                                  </div>
                                  <div className="space-y-2">
                                    {diagnosticList.length > 0 ? (
                                      diagnosticList.map((dq, idx) => (
                                        <div
                                          key={idx}
                                          className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200/60 dark:border-gray-800/60 text-xs"
                                        >
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-0.5">
                                            Step {idx + 1}
                                          </div>
                                          <p className="text-black dark:text-white font-medium">{dq}</p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">No diagnostic questions defined.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Col 2: Reason & Home Remedy Guidance */}
                                <div className="space-y-4">
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                                      Pathology & Clinical Reason
                                    </div>
                                    <p className="text-xs text-black dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 leading-relaxed">
                                      {item.answer?.reasonText || 'No clinical reason recorded.'}
                                    </p>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-1">
                                      Home Remedy & Prescription
                                    </div>
                                    <p className="text-xs text-black dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 leading-relaxed font-medium">
                                      {item.homeRemedyText ||
                                        item.answer?.remedyText ||
                                        item.answer?.homeRemedyText ||
                                        'No remedy specified.'}
                                    </p>
                                  </div>
                                </div>

                                {/* Col 3: Media / YouTube Video Preview */}
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                                    <Video className="w-4 h-4" />
                                    <span>Video Demonstration</span>
                                  </div>
                                  {youtubeId ? (
                                    <div className="space-y-2">
                                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-black">
                                        <iframe
                                          src={`https://www.youtube.com/embed/${youtubeId}`}
                                          title="Remedy Video Demonstration"
                                          className="w-full h-full"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                      </div>
                                      <a
                                        href={item.videoUrl || item.answer?.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-xs font-medium text-black dark:text-white hover:underline"
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Watch on YouTube
                                      </a>
                                    </div>
                                  ) : item.videoUrl || item.answer?.videoUrl ? (
                                    <a
                                      href={item.videoUrl || item.answer?.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-xs font-medium text-black dark:text-white hover:underline"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                      Open External Video Link
                                    </a>
                                  ) : (
                                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200/60 dark:border-gray-800/60 text-center text-gray-400 dark:text-gray-500 text-xs">
                                      No video attached to this knowledge base item.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div>
              Page <strong className="text-black dark:text-white">{currentPage}</strong> of{' '}
              <strong className="text-black dark:text-white">{totalPages}</strong>
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage <= 1 || tableLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold text-black dark:text-white bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages || tableLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold text-black dark:text-white bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      {isKnowledgeModalOpen && (
        <KnowledgeModal
          isOpen={isKnowledgeModalOpen}
          mode={knowledgeModalMode}
          initialData={selectedKnowledgeItem}
          onClose={() => setIsKnowledgeModalOpen(false)}
          onSuccess={() => {
            setIsKnowledgeModalOpen(false);
            fetchStats();
            fetchItems();
          }}
        />
      )}

      {isDeleteModalOpen && itemToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          itemTitle={itemToDelete.canonicalQuestionText}
          isDeleting={isDeleting}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {isBulkUploadOpen && (
        <BulkUploadModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onSuccess={() => {
            setIsBulkUploadOpen(false);
            fetchStats();
            fetchItems();
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
