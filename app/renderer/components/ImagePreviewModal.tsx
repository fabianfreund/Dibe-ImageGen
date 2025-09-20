import React, { useState } from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageData: string;
  imageIndex: number;
  onClose: () => void;
  onDownload: (imageData: string, index: number) => void;
  prompt?: string;
  onReuse?: (imageData: string, prompt: string) => void;
  onEdit?: (imageData: string, index: number) => void;
  downloadState?: 'idle' | 'downloading' | 'downloaded';
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  imageData,
  imageIndex,
  onClose,
  onDownload,
  prompt,
  onReuse,
  onEdit,
  downloadState = 'idle'
}) => {
  const [showPrompt, setShowPrompt] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              Generated Image {imageIndex + 1}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              AI Generated Image
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4">
          {/* Image */}
          <img
            src={imageData}
            alt={`Generated image ${imageIndex + 1}`}
            className="max-w-full max-h-96 mx-auto object-contain rounded"
          />

          {/* Prompt Toggle */}
          {prompt && (
            <div className="mt-4">
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  {showPrompt ? 'Hide Prompt' : 'Show Prompt'}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${showPrompt ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPrompt && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">{prompt}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 bg-gray-50 -mx-4 -mb-4 p-4 border-t border-gray-200">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-3 w-full max-w-lg">
                {/* Reuse Button */}
                {onReuse && prompt && (
                  <button
                    onClick={() => onReuse(imageData, prompt)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                  >
                    <svg className="w-4 h-4 text-purple-600 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Reuse</span>
                  </button>
                )}

                {/* Edit Button */}
                {onEdit && (
                  <button
                    onClick={() => onEdit(imageData, imageIndex)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                  >
                    <svg className="w-4 h-4 text-blue-600 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}

                {/* Download Button */}
                <button
                  onClick={() => onDownload(imageData, imageIndex)}
                  disabled={downloadState === 'downloading'}
                  className={`flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                    downloadState === 'downloaded'
                      ? 'bg-green-600 text-white border border-green-600'
                      : downloadState === 'downloading'
                      ? 'bg-primary/70 text-white border border-primary/70 cursor-not-allowed'
                      : 'bg-primary text-white border border-primary hover:bg-primary/90 hover:shadow-md'
                  }`}
                >
                  {downloadState === 'downloading' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin sm:mr-2"></div>
                  ) : downloadState === 'downloaded' ? (
                    <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">
                    {downloadState === 'downloading' ? 'Downloading...' : downloadState === 'downloaded' ? 'Downloaded' : 'Download'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;