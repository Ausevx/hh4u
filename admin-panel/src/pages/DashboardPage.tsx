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
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { admin, logout } = useAuth();

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
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col text-[#0F2027]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0E7C86] flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base text-[#0F2027] leading-tight">Healing Hands4U</h1>
                <span className="bg-[#EAF5F6] text-[#0E7C86] text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Admin Portal
                </span>
              </div>
              <p className="text-xs text-[#5C7480]">Knowledge Base Management & Vector Sync</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="/healing-hands-4u.apk"
              download
              className="inline-flex items-center px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download APK
            </a>

            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-[#0F2027] bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-[#0E7C86]" />
              Bulk Import (.xlsx)
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Knowledge Entry
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-[#0F2027]">{admin?.email}</p>
                <p className="text-[10px] text-[#5C7480] uppercase tracking-wider">{admin?.role || 'Admin'}</p>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Stat Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Questions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#EAF5F6] flex items-center justify-center text-[#0E7C86] flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C7480]">Level 1 Questions</p>
              <p className="text-2xl font-bold text-[#0F2027]">
                {statsLoading ? '...' : stats?.totalQuestions ?? 0}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {stats?.activeQuestions ?? 0} Active in App
              </p>
            </div>
          </div>

          {/* Card 2: Consultations */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C7480]">Diagnostic Trees</p>
              <p className="text-2xl font-bold text-[#0F2027]">
                {statsLoading ? '...' : stats?.totalConsultations ?? 0}
              </p>
              <p className="text-[11px] text-[#5C7480] font-medium mt-0.5">Yes/No Logic Branches</p>
            </div>
          </div>

          {/* Card 3: Answers & Remedies */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C7480]">Remedies & Answers</p>
              <p className="text-2xl font-bold text-[#0F2027]">
                {statsLoading ? '...' : stats?.totalAnswers ?? 0}
              </p>
              <p className="text-[11px] text-[#5C7480] font-medium mt-0.5">Homeopathic Guidance</p>
            </div>
          </div>

          {/* Card 4: Vector Index Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C7480]">Atlas Vector Search</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${stats?.vectorIndexActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <p className="text-sm font-bold text-[#0F2027]">
                  {statsLoading ? '...' : stats?.vectorIndexActive ? 'Index Active' : 'Fallback Cosine'}
                </p>
              </div>
              <p className="text-[11px] text-[#5C7480] font-medium mt-0.5">1536-dim Cosine Embeddings</p>
            </div>
          </div>
        </section>

        {/* Knowledge Base Table Card */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Table Controls Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, tags, remedies, diagnostic criteria..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs text-[#5C7480]">
              <span>
                Showing <strong className="text-[#0F2027]">{items.length}</strong> of{' '}
                <strong className="text-[#0F2027]">{totalItems}</strong> entries
              </span>
              <button
                onClick={handleRefreshAll}
                title="Refresh Table"
                className="p-2 text-slate-500 hover:text-[#0E7C86] hover:bg-[#EAF5F6] rounded-lg transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-[#5C7480]">
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
                    <td colSpan={7} className="py-12 text-center text-[#5C7480]">
                      <div className="inline-flex flex-col items-center space-y-2">
                        <RotateCw className="w-6 h-6 animate-spin text-[#0E7C86]" />
                        <span>Loading Knowledge Base records...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#5C7480]">
                      <div className="inline-flex flex-col items-center space-y-2">
                        <HelpCircle className="w-8 h-8 text-slate-300" />
                        <span className="font-medium text-sm text-[#0F2027]">No knowledge base items found</span>
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
                          className={`hover:bg-[#F7F9FB] cursor-pointer transition-colors ${
                            isExpanded ? 'bg-[#F7F9FB]/80' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#0E7C86]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#0F2027] max-w-md">
                            <span className="line-clamp-2">{item.canonicalQuestionText}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.tags && item.tags.length > 0 ? (
                                item.tags.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-medium"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="bg-[#EAF5F6] text-[#0E7C86] font-semibold px-2 py-0.5 rounded-full text-[10px]">
                              {diagnosticList.length} Steps
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {hasVideo ? (
                              <span className="inline-flex items-center text-rose-600 font-medium text-[11px]">
                                <Video className="w-3.5 h-3.5 mr-1" />
                                Video
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
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
                                className="p-1.5 text-slate-400 hover:text-[#0E7C86] hover:bg-[#EAF5F6] rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleOpenDeleteModal(item, e)}
                                title="Delete Question"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Accordion Row Details */}
                        {isExpanded && (
                          <tr className="bg-[#F7F9FB]/40">
                            <td colSpan={7} className="p-4 sm:p-6 border-y border-slate-100">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm">
                                {/* Col 1: Diagnostic Questions Tree */}
                                <div className="space-y-3">
                                   <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#0E7C86]">
                                    <GitBranch className="w-4 h-4" />
                                    <span>Diagnostic Questions</span>
                                  </div>
                                  <div className="space-y-2">
                                    {diagnosticList.length > 0 ? (
                                      diagnosticList.map((dq, idx) => (
                                        <div
                                          key={idx}
                                          className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs"
                                        >
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5C7480] mb-0.5">
                                            Step {idx + 1}
                                          </div>
                                          <p className="text-[#0F2027] font-medium">{dq}</p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">No diagnostic questions defined.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Col 2: Reason & Home Remedy Guidance */}
                                <div className="space-y-4">
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
                                      Pathology & Clinical Reason
                                    </div>
                                    <p className="text-xs text-[#0F2027] bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                                      {item.answer?.reasonText || 'No clinical reason recorded.'}
                                    </p>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-[#0E7C86] mb-1">
                                      Home Remedy & Prescription
                                    </div>
                                    <p className="text-xs text-[#0F2027] bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 leading-relaxed font-medium">
                                      {item.homeRemedyText ||
                                        item.answer?.remedyText ||
                                        item.answer?.homeRemedyText ||
                                        'No remedy specified.'}
                                    </p>
                                  </div>
                                </div>

                                {/* Col 3: Media / YouTube Video Preview */}
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-rose-600">
                                    <Video className="w-4 h-4" />
                                    <span>Video Demonstration</span>
                                  </div>
                                  {youtubeId ? (
                                    <div className="space-y-2">
                                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-black">
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
                                        className="inline-flex items-center text-xs font-medium text-[#0E7C86] hover:underline"
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
                                      className="inline-flex items-center text-xs font-medium text-[#0E7C86] hover:underline"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                      Open External Video Link
                                    </a>
                                  ) : (
                                    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200/60 text-center text-slate-400 text-xs">
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
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-[#5C7480]">
            <div>
              Page <strong className="text-[#0F2027]">{currentPage}</strong> of{' '}
              <strong className="text-[#0F2027]">{totalPages}</strong>
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage <= 1 || tableLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-[#0F2027] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages || tableLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-[#0F2027] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
