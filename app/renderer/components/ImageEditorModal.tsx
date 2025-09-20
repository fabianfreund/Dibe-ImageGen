import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageEditorModalProps {
  isOpen: boolean;
  imageData: string;
  imageName: string;
  onClose: () => void;
  onSave: (croppedImageData: string, filename: string) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PresetSize {
  name: string;
  ratio: number;
  label: string;
}

const PRESET_SIZES: PresetSize[] = [
  { name: 'square', ratio: 1, label: 'Square (1:1)' },
  { name: 'landscape', ratio: 16/9, label: 'Landscape (16:9)' },
  { name: 'portrait', ratio: 4/5, label: 'Portrait (4:5)' },
  { name: 'story', ratio: 9/16, label: 'Story (9:16)' },
  { name: 'custom', ratio: 0, label: 'Custom' },
];

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  imageData,
  imageName,
  onClose,
  onSave
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize crop area when image loads
  useEffect(() => {
    if (isOpen && imageData && !isImageLoaded) {
      const img = new Image();
      img.onload = () => {
        setLoadedImage(img);
        setIsImageLoaded(true);
        initializeCropArea(img);
        drawCanvas(img);
      };
      img.src = imageData;
    }
  }, [isOpen, imageData, isImageLoaded]);

  const initializeCropArea = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const containerWidth = 600;
    const containerHeight = 400;
    const scale = Math.min(containerWidth / img.width, containerHeight / img.height);

    const displayWidth = img.width * scale;
    const displayHeight = img.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Initialize crop area to center 80% of image
    const cropSize = Math.min(displayWidth, displayHeight) * 0.8;
    setCropArea({
      x: (displayWidth - cropSize) / 2,
      y: (displayHeight - cropSize) / 2,
      width: cropSize,
      height: cropSize
    });
  };

  const drawCanvas = useCallback((img?: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const image = img || loadedImage;
    if (!image) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw overlay (darken non-crop area)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Draw crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw resize handles
    const handleSize = 8;
    ctx.fillStyle = '#3b82f6';

    // Corner handles
    ctx.fillRect(cropArea.x - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropArea.x - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
    ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
  }, [cropArea, loadedImage]);

  useEffect(() => {
    if (isImageLoaded) {
      drawCanvas();
    }
  }, [cropArea, drawCanvas, isImageLoaded]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getResizeHandle = (mouseX: number, mouseY: number) => {
    const handleSize = 8;
    const tolerance = handleSize;

    // Check corner handles
    if (Math.abs(mouseX - cropArea.x) < tolerance && Math.abs(mouseY - cropArea.y) < tolerance) return 'nw';
    if (Math.abs(mouseX - (cropArea.x + cropArea.width)) < tolerance && Math.abs(mouseY - cropArea.y) < tolerance) return 'ne';
    if (Math.abs(mouseX - cropArea.x) < tolerance && Math.abs(mouseY - (cropArea.y + cropArea.height)) < tolerance) return 'sw';
    if (Math.abs(mouseX - (cropArea.x + cropArea.width)) < tolerance && Math.abs(mouseY - (cropArea.y + cropArea.height)) < tolerance) return 'se';

    return '';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    const handle = getResizeHandle(x, y);

    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      setDragStart({ x, y });
    } else if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
               y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isResizing && resizeHandle) {
      let newCrop = { ...cropArea };
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;

      // Check if we should maintain aspect ratio
      const currentPreset = PRESET_SIZES.find(p => p.name === selectedPreset);
      const shouldMaintainRatio = currentPreset && currentPreset.ratio > 0;
      const targetRatio = currentPreset?.ratio || 1;

      if (shouldMaintainRatio) {
        // Maintain aspect ratio during resize
        switch (resizeHandle) {
          case 'nw': {
            const newWidth = newCrop.width - deltaX;
            const newHeight = newWidth / targetRatio;
            const deltaHeight = newCrop.height - newHeight;
            newCrop = {
              ...newCrop,
              x: newCrop.x + deltaX,
              y: newCrop.y + deltaHeight,
              width: newWidth,
              height: newHeight
            };
            break;
          }
          case 'ne': {
            const newWidth = x - cropArea.x;
            const newHeight = newWidth / targetRatio;
            const deltaHeight = newCrop.height - newHeight;
            newCrop = {
              ...newCrop,
              y: newCrop.y + deltaHeight,
              width: newWidth,
              height: newHeight
            };
            break;
          }
          case 'sw': {
            const newWidth = newCrop.width - deltaX;
            const newHeight = newWidth / targetRatio;
            newCrop = {
              ...newCrop,
              x: newCrop.x + deltaX,
              width: newWidth,
              height: newHeight
            };
            break;
          }
          case 'se': {
            const newWidth = x - cropArea.x;
            const newHeight = newWidth / targetRatio;
            newCrop = {
              ...newCrop,
              width: newWidth,
              height: newHeight
            };
            break;
          }
        }
      } else {
        // Free resize (custom mode or no preset selected)
        switch (resizeHandle) {
          case 'nw':
            newCrop = {
              ...newCrop,
              x: newCrop.x + deltaX,
              y: newCrop.y + deltaY,
              width: newCrop.width - deltaX,
              height: newCrop.height - deltaY
            };
            break;
          case 'ne':
            newCrop = {
              ...newCrop,
              y: newCrop.y + deltaY,
              width: x - cropArea.x,
              height: newCrop.height - deltaY
            };
            break;
          case 'sw':
            newCrop = {
              ...newCrop,
              x: newCrop.x + deltaX,
              width: newCrop.width - deltaX,
              height: y - cropArea.y
            };
            break;
          case 'se':
            newCrop = {
              ...newCrop,
              width: x - cropArea.x,
              height: y - cropArea.y
            };
            break;
        }
      }

      // Constrain to canvas bounds
      newCrop = {
        ...newCrop,
        x: Math.max(0, newCrop.x),
        y: Math.max(0, newCrop.y),
        width: Math.min(canvas.width - newCrop.x, Math.max(20, newCrop.width)),
        height: Math.min(canvas.height - newCrop.y, Math.max(20, newCrop.height))
      };

      setCropArea(newCrop);
      setDragStart({ x, y });
    } else if (isDragging) {
      const newX = Math.max(0, Math.min(canvas.width - cropArea.width, x - dragStart.x));
      const newY = Math.max(0, Math.min(canvas.height - cropArea.height, y - dragStart.y));

      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else {
      // Update cursor based on hover area
      const handle = getResizeHandle(x, y);
      if (handle) {
        canvas.style.cursor = `${handle}-resize`;
      } else if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
                 y >= cropArea.y && y <= cropArea.y + cropArea.height) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  };

  const applyPresetRatio = (preset: PresetSize) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSelectedPreset(preset.name);

    const maxWidth = canvas.width * 0.8;
    const maxHeight = canvas.height * 0.8;

    let width, height;
    if (preset.ratio >= 1) {
      // Landscape or square
      width = Math.min(maxWidth, maxHeight * preset.ratio);
      height = width / preset.ratio;
    } else {
      // Portrait
      height = Math.min(maxHeight, maxWidth / preset.ratio);
      width = height * preset.ratio;
    }

    setCropArea({
      x: (canvas.width - width) / 2,
      y: (canvas.height - height) / 2,
      width,
      height
    });
  };

  const resetCrop = () => {
    setSelectedPreset('custom');
    if (loadedImage) {
      initializeCropArea(loadedImage);
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const image = loadedImage;
    if (!canvas || !image) return;

    setIsSaving(true);

    try {
      // Create a new canvas for the cropped image
      const cropCanvas = document.createElement('canvas');
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return;

      // Calculate the scale factor between canvas and original image
      const scaleX = image.width / canvas.width;
      const scaleY = image.height / canvas.height;

      // Set the crop canvas size to the crop area size in original image dimensions
      cropCanvas.width = cropArea.width * scaleX;
      cropCanvas.height = cropArea.height * scaleY;

      // Draw the cropped portion of the original image
      cropCtx.drawImage(
        image,
        cropArea.x * scaleX, // source x
        cropArea.y * scaleY, // source y
        cropArea.width * scaleX, // source width
        cropArea.height * scaleY, // source height
        0, // destination x
        0, // destination y
        cropCanvas.width, // destination width
        cropCanvas.height // destination height
      );

      // Convert to data URL
      const croppedImageData = cropCanvas.toDataURL('image/png');

      // Generate filename
      const timestamp = Date.now();
      const baseName = imageName.replace(/\.[^/.]+$/, '');
      const filename = `${baseName}_cropped_${timestamp}.png`;

      onSave(croppedImageData, filename);
    } catch (error) {
      console.error('Failed to save cropped image:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsImageLoaded(false);
    setLoadedImage(null);
    setSelectedPreset('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Image Editor</h3>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Preset Buttons */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Crop Presets</h4>
              <button
                onClick={resetCrop}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_SIZES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPresetRatio(preset)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedPreset === preset.name
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex justify-center mb-4">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="border border-gray-300 rounded"
            />
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 text-center mb-4">
            Drag to move • Drag corners to resize • Use presets for common ratios
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isImageLoaded}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                isSaving
                  ? 'bg-primary/70 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Cropped Image'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;