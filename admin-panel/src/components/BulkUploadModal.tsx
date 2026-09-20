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
      <div className="bg-white dark:bg-black rounded-2xl max-w-xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-black dark:text-white">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-black dark:text-white">Bulk Import Knowledge Base</h2>
              <p className="text-[11px] text-gray-600 dark:text-gray-400">Upload an .xlsx dataset with level1, ConsultationQueries, Answers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {importResult ? (
            /* Success View */
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">Import Completed Successfully!</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Atlas Vector embeddings generated and MongoDB collections upserted.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-center">
                <div className="p-2">
                  <BookOpen className="w-4 h-4 text-black dark:text-white mx-auto mb-1" />
                  <p className="text-lg font-bold text-black dark:text-white">{importResult.counts.questions}</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">Questions</p>
                </div>
                <div className="p-2 border-x border-gray-200 dark:border-gray-800">
                  <GitBranch className="w-4 h-4 text-black dark:text-white mx-auto mb-1" />
                  <p className="text-lg font-bold text-black dark:text-white">{importResult.counts.consultations}</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">Consultations</p>
                </div>
                <div className="p-2">
                  <Pill className="w-4 h-4 text-gray-800 dark:text-gray-200 mx-auto mb-1" />
                  <p className="text-lg font-bold text-black dark:text-white">{importResult.counts.answers}</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wider font-semibold">Answers</p>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Import Another
                </button>
                <button
                  type="button"
                  onClick={onSuccess}
                  className="px-5 py-2 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl transition-colors shadow-sm"
                >
                  Close & Refresh Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* Upload View */
            <div className="space-y-4">
              {errorMessage && (
                <div className="rounded-xl bg-gray-100 dark:bg-gray-900 p-3.5 border border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="flex items-start space-x-2 text-xs text-black dark:text-white font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  {errorDetails.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-black/90 dark:text-white/90 pl-5 space-y-0.5">
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
                    ? 'border-black dark:border-white bg-gray-100/40 dark:bg-gray-900/40 scale-[0.99]'
                    : 'border-gray-200 dark:border-gray-800 hover:border-black dark:border-white/50 bg-gray-50/50 dark:bg-gray-900/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-900 text-black dark:text-white flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-black dark:text-white">
                  Click to select or drag and drop your .xlsx workbook
                </p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                  Expected sheets: <strong>level1</strong>, <strong>ConsultationQueries</strong>, <strong>Answers</strong>
                </p>
              </div>

              {/* Selected File Card */}
              {file && (
                <div className="p-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileSpreadsheet className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-black dark:text-white truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Progress Indicator */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-black dark:text-white">
                    <span className="flex items-center">
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-black dark:text-white" />
                      Ingesting and vectorizing...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-black dark:bg-white h-2 rounded-full transition-all duration-300 ease-out"
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
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartUpload}
                  disabled={!file || isUploading}
                  className="px-5 py-2 text-xs font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
