import React, { useState, useEffect } from 'react';
import { KnowledgeBaseItem, CreateKnowledgeBaseInput, UpdateKnowledgeBaseInput } from '../types';
import { api, ApiError } from '../services/api';
import { X, Loader2, AlertCircle, Video, Tag, Check } from 'lucide-react';

interface KnowledgeModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: KnowledgeBaseItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSuccess,
}) => {
  const [canonicalQuestionText, setCanonicalQuestionText] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [diagnosticQ1, setDiagnosticQ1] = useState('');
  const [diagnosticQ2, setDiagnosticQ2] = useState('');
  const [diagnosticQ3, setDiagnosticQ3] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [remedyText, setRemedyText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setCanonicalQuestionText(initialData.canonicalQuestionText || '');
      setTagsInput((initialData.tags || []).join(', '));

      const diagList =
        initialData.diagnosticQuestions ||
        initialData.consultationQuery?.diagnosticQuestions.map((dq) => dq.questionText) ||
        [];
      setDiagnosticQ1(diagList[0] || '');
      setDiagnosticQ2(diagList[1] || '');
      setDiagnosticQ3(diagList[2] || '');

      setReasonText(initialData.answer?.reasonText || '');
      setRemedyText(
        initialData.homeRemedyText ||
          initialData.answer?.remedyText ||
          initialData.answer?.homeRemedyText ||
          ''
      );
      setVideoUrl(initialData.videoUrl || initialData.answer?.videoUrl || '');
      setIsActive(initialData.isActive !== false);
    } else {
      setCanonicalQuestionText('');
      setTagsInput('homeopathy, general');
      setDiagnosticQ1('');
      setDiagnosticQ2('');
      setDiagnosticQ3('');
      setReasonText('');
      setRemedyText('');
      setVideoUrl('');
      setIsActive(true);
    }
    setErrorMessage(null);
  }, [initialData, mode]);

  if (!isOpen) return null;

  // Extract YouTube ID for thumbnail preview
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };
  const previewYouTubeId = getYouTubeId(videoUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!canonicalQuestionText.trim()) {
      setErrorMessage('Canonical question text is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const diagnosticQuestions = [diagnosticQ1.trim(), diagnosticQ2.trim(), diagnosticQ3.trim()].filter(
      Boolean
    );

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const payload: CreateKnowledgeBaseInput = {
          canonicalQuestionText: canonicalQuestionText.trim(),
          tags,
          diagnosticQuestions,
          reasonText: reasonText.trim(),
          remedyText: remedyText.trim(),
          homeRemedyText: remedyText.trim(),
          videoUrl: videoUrl.trim(),
          isActive,
        };
        await api.knowledgeBase.create(payload);
      } else if (initialData) {
        const payload: UpdateKnowledgeBaseInput = {
          canonicalQuestionText: canonicalQuestionText.trim(),
          tags,
          diagnosticQuestions,
          reasonText: reasonText.trim(),
          remedyText: remedyText.trim(),
          homeRemedyText: remedyText.trim(),
          videoUrl: videoUrl.trim(),
          isActive,
        };
        await api.knowledgeBase.update(initialData.id, payload);
      }
      onSuccess();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save knowledge base item';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F2027]">
            {mode === 'create' ? 'Create Knowledge Base Entry' : 'Edit Knowledge Base Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="rounded-xl bg-[#FFF0EC] p-3.5 border border-rose-200 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-[#A14A2A] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#A14A2A] font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Canonical Question */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
              Canonical Health Question <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={canonicalQuestionText}
              onChange={(e) => setCanonicalQuestionText(e.target.value)}
              placeholder="e.g. What helps with severe migraine headache?"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
              Tags (comma separated)
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="headache, pain, migraine, urgent"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* 3 Diagnostic Questions */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0E7C86]">
              Diagnostic Tree Questions (Yes/No Steps)
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={diagnosticQ1}
                onChange={(e) => setDiagnosticQ1(e.target.value)}
                placeholder="Diagnostic Question 1 (e.g. Is the pain throbbing on one side of head?)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
              <input
                type="text"
                value={diagnosticQ2}
                onChange={(e) => setDiagnosticQ2(e.target.value)}
                placeholder="Diagnostic Question 2 (e.g. Is it triggered or worsened by bright light?)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
              <input
                type="text"
                value={diagnosticQ3}
                onChange={(e) => setDiagnosticQ3(e.target.value)}
                placeholder="Diagnostic Question 3 (e.g. Is nausea or visual disturbance present?)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
            </div>
          </div>

          {/* Pathology Reason & Remedy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
                Clinical Reason & Cause
              </label>
              <textarea
                rows={3}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Explain the underlying cause or pathology..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0E7C86] mb-1">
                Home Remedy & Prescription
              </label>
              <textarea
                rows={3}
                value={remedyText}
                onChange={(e) => setRemedyText(e.target.value)}
                placeholder="Recommended remedy, potency, and dosage..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
            </div>
          </div>

          {/* Video URL & Live Preview */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
              YouTube Video URL
            </label>
            <div className="relative">
              <Video className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
            </div>
            {previewYouTubeId && (
              <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={`https://img.youtube.com/vi/${previewYouTubeId}/hqdefault.jpg`}
                  alt="YouTube Preview"
                  className="w-20 h-12 object-cover rounded-lg"
                />
                <span className="text-[11px] text-emerald-600 font-medium flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Valid YouTube link attached
                </span>
              </div>
            )}
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-[#0E7C86] focus:ring-[#0E7C86] h-4 w-4 border-slate-300"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-[#0F2027]">
              Make this entry active immediately in Android App
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#5C7480] hover:text-[#0F2027] hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {mode === 'create' ? 'Save Entry' : 'Update Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KnowledgeModal;
