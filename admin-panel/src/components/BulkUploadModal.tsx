import React, { useState, useRef } from 'react';
import { api, ApiError } from '../services/api';
import { ImportResponse } from '../types';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  GitBranch,
  Pill,
} from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);
    setErrorDetails([]);

    if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setErrorMessage('Only Excel (.xlsx) files are supported.');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 20MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleStartUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      const res = await api.knowledgeBase.importExcel(file, (percent) => {
        setUploadProgress(percent);
      });
      setImportResult(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        if (err.details && Array.isArray(err.details)) {
          setErrorDetails(err.details);
        }
      } else {
        setErrorMessage('An unexpected error occurred during import.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setErrorMessage(null);
    setErrorDetails([]);
    setUploadProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EAF5F6] flex items-center justify-center text-[#0E7C86]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F2027]">Bulk Import Knowledge Base</h2>
              <p className="text-[11px] text-[#5C7480]">Upload an .xlsx dataset with level1, ConsultationQueries, Answers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {importResult ? (
            /* Success View */
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F2027]">Import Completed Successfully!</h3>
                <p className="text-xs text-[#5C7480] mt-1">
                  Atlas Vector embeddings generated and MongoDB collections upserted.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                <div className="p-2">
                  <BookOpen className="w-4 h-4 text-[#0E7C86] mx-auto mb-1" />
                  <p className="text-lg font-bold text-[#0F2027]">{importResult.counts.questions}</p>
                  <p className="text-[10px] text-[#5C7480] uppercase tracking-wider font-semibold">Questions</p>
                </div>
                <div className="p-2 border-x border-slate-200">
                  <GitBranch className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-[#0F2027]">{importResult.counts.consultations}</p>
                  <p className="text-[10px] text-[#5C7480] uppercase tracking-wider font-semibold">Consultations</p>
                </div>
                <div className="p-2">
                  <Pill className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-[#0F2027]">{importResult.counts.answers}</p>
                  <p className="text-[10px] text-[#5C7480] uppercase tracking-wider font-semibold">Answers</p>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-[#5C7480] hover:text-[#0F2027] hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Import Another
                </button>
                <button
                  type="button"
                  onClick={onSuccess}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] rounded-xl transition-colors shadow-sm"
                >
                  Close & Refresh Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* Upload View */
            <div className="space-y-4">
              {errorMessage && (
                <div className="rounded-xl bg-[#FFF0EC] p-3.5 border border-rose-200 space-y-2">
                  <div className="flex items-start space-x-2 text-xs text-[#A14A2A] font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  {errorDetails.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-[#A14A2A]/90 pl-5 space-y-0.5">
                      {errorDetails.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-[#0E7C86] bg-[#EAF5F6]/40 scale-[0.99]'
                    : 'border-slate-200 hover:border-[#0E7C86]/50 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-[#EAF5F6] text-[#0E7C86] flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-[#0F2027]">
                  Click to select or drag and drop your .xlsx workbook
                </p>
                <p className="text-[11px] text-[#5C7480] mt-1">
                  Expected sheets: <strong>level1</strong>, <strong>ConsultationQueries</strong>, <strong>Answers</strong>
                </p>
              </div>

              {/* Selected File Card */}
              {file && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileSpreadsheet className="w-5 h-5 text-[#0E7C86] flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-[#0F2027] truncate">{file.name}</p>
                      <p className="text-[10px] text-[#5C7480]">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Progress Indicator */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-[#0F2027]">
                    <span className="flex items-center">
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#0E7C86]" />
                      Ingesting and vectorizing...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0E7C86] h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold text-[#5C7480] hover:text-[#0F2027] hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartUpload}
                  disabled={!file || isUploading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Processing Import...
                    </>
                  ) : (
                    'Upload and Ingest'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
