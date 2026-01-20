import React from 'react';

interface ImageDownscaleConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  oversizedImages: Array<{ name: string; width: number; height: number }>;
  onConfirm: () => void;
  onCancel: () => void;
}

const ImageDownscaleConfirmationModal: React.FC<ImageDownscaleConfirmationModalProps> = ({
  isOpen,
  onClose,
  oversizedImages,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      onConfirm();
    }
  };

  const totalImages = oversizedImages.length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
            </svg>
            <span>Images Need Downscaling</span>
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <p className="text-gray-700 mb-4">
            {totalImages === 1
              ? 'The following image exceeds the maximum size of 4096x4096 pixels:'
              : `${totalImages} images exceed the maximum size of 4096x4096 pixels:`
            }
          </p>

          {/* List of oversized images */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
            {oversizedImages.map((image, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-800 font-medium truncate flex-1 mr-2">
                  {image.name}
                </span>
                <span className="text-gray-600 whitespace-nowrap">
                  {image.width} × {image.height} px
                </span>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm text-blue-800">
              <strong>What will happen:</strong> These images will be downscaled to fit within 1024×1024 pixels
              while maintaining their aspect ratio. This is required for image generation.
            </p>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Yes, Downscale and Generate
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageDownscaleConfirmationModal;
