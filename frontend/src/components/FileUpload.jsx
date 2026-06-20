import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { portfolioService } from '../services/api';

export function FileUpload({ onUploadSuccess }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a portfolio name.');
      return;
    }
    if (!file) {
      setError('Please select a portfolio CSV file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await portfolioService.upload(name.trim(), file);
      onUploadSuccess(result.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload portfolio. Check CSV format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto p-2">
      <div>
        <label htmlFor="portfolio-name" className="block text-sm font-semibold text-gray-700 mb-2">
          Portfolio Name
        </label>
        <input
          id="portfolio-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Retirement Savings, Tech Stock allocation"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Portfolio CSV File
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-blue-500 bg-blue-50/50'
              : file
              ? 'border-green-500 bg-green-50/10'
              : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/30'
          }`}
        >
          <input {...getInputProps()} />
          
          {file ? (
            <div className="space-y-2">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-base font-semibold text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-500 font-mono">{(file.size / 1024).toFixed(2)} KB</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-xs font-semibold text-red-500 hover:text-red-700 underline mt-2 inline-block"
              >
                Remove File
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-base font-semibold text-gray-750">
                Drag 'n' drop your CSV file here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                File must include column headers: Symbol, Quantity, Purchase Price
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 font-medium">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3.5 px-4 font-bold text-white rounded-xl shadow-lg transition-all hover:shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 ${
          loading
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
        }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Uploading & Fetching Market Data...</span>
          </>
        ) : (
          <>
            <FileText className="h-5 w-5" />
            <span>Generate Portfolio & Analytics</span>
          </>
        )}
      </button>
    </form>
  );
}
