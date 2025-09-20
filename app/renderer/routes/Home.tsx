import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ImagePreviewModal from '../components/ImagePreviewModal';
import PresetManagerModal from '../components/PresetManagerModal';

interface PromptPreset {
  name: string;
  tags: string[];
  prompt: string;
}

interface ImagePreview {
  file: File;
  url: string;
}

const Home: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset | null>(null);
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastGeneration, setLastGeneration] = useState<{images: File[], prompt: string} | null>(null);
  const [settings, setSettings] = useState<{libraryAutoSave?: boolean} | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Preset manager modal state
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);

  // Enhanced prompt panel state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isTagFilterCollapsed, setIsTagFilterCollapsed] = useState(true);

  // Refs for drag and drop
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPresets();
    loadSettings();
  }, []);

  // Handle URL parameters (for reuse prompt and image functionality)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const promptParam = searchParams.get('prompt');
    const imageParam = searchParams.get('image');

    if (promptParam) {
      const decodedPrompt = decodeURIComponent(promptParam);
      setPrompt(decodedPrompt);
    }

    if (imageParam) {
      try {
        const decodedImageData = decodeURIComponent(imageParam);

        // Convert base64 data URL to File object
        const byteString = atob(decodedImageData.split(',')[1]);
        const mimeString = decodedImageData.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], 'reused-image.png', { type: mimeString });

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);

        // Set the image as selected
        setSelectedImages([file]);
        setImagePreviews([{ file, url: previewUrl }]);
      } catch (error) {
        console.error('Failed to process reused image:', error);
      }
    }

    // Clear the URL parameters to keep the URL clean
    if (promptParam || imageParam) {
      navigate('/', { replace: true });
    }
  }, [location.search, navigate]);

  const loadSettings = async () => {
    try {
      const appSettings = await window.electronAPI.settings.get();
      setSettings(appSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const loadedPresets = await window.electronAPI.presets.get();
      setPresets(loadedPresets);

      // Extract unique tags from all presets
      const allTags = loadedPresets.flatMap((preset: PromptPreset) => preset.tags);
      const uniqueTags = Array.from(new Set(allTags));
      setAvailableTags(uniqueTags);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const handlePresetsUpdate = async (updatedPresets: PromptPreset[]) => {
    try {
      await window.electronAPI.presets.save(updatedPresets);
      setPresets(updatedPresets);

      // Update available tags
      const allTags = updatedPresets.flatMap((preset: PromptPreset) => preset.tags);
      const uniqueTags = Array.from(new Set(allTags));
      setAvailableTags(uniqueTags);

      // Clear selected tags if they no longer exist
      setSelectedTags(prev => prev.filter(tag => uniqueTags.includes(tag)));
    } catch (error) {
      console.error('Failed to save presets:', error);
      alert('Failed to save presets');
    }
  };

  // Clean up object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  const createImagePreviews = (files: File[]) => {
    // Clean up existing previews
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));

    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setImagePreviews(newPreviews);
    setSelectedImages(files);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    createImagePreviews(files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      createImagePreviews(files);
    }
  };

  const removeImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    const newFiles = selectedImages.filter((_, i) => i !== index);

    // Clean up the removed preview URL
    URL.revokeObjectURL(imagePreviews[index].url);

    setImagePreviews(newPreviews);
    setSelectedImages(newFiles);
  };

  const handlePresetSelect = (preset: PromptPreset) => {
    setSelectedPreset(preset);
    setPrompt(preset.prompt);
  };

  // New helper functions for enhanced panel
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllTags = () => {
    setSelectedTags([]);
  };

  const togglePanel = () => {
    setIsPanelCollapsed(prev => !prev);
  };

  const toggleTagFilter = () => {
    setIsTagFilterCollapsed(prev => !prev);
  };

  // Filter presets based on selected tags
  const filteredPresets = selectedTags.length === 0
    ? presets
    : presets.filter(preset =>
        selectedTags.every(tag => preset.tags.includes(tag))
      );

  const handleGenerate = async () => {
    if (!prompt.trim() || selectedImages.length === 0) {
      alert('Please select images and enter a prompt');
      return;
    }

    // Save current generation data for retry/reuse
    setLastGeneration({
      images: selectedImages,
      prompt: prompt.trim()
    });

    setIsGenerating(true);
    setIsInputCollapsed(true);
    setGenerationStatus('Preparing images...');
    setGeneratedImages([]);

    try {
      // Save uploaded files to temporary directory
      const imagePaths: string[] = [];
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        setGenerationStatus(`Preparing image ${i + 1}/${selectedImages.length}...`);

        const buffer = await file.arrayBuffer();
        const tempPath = await window.electronAPI.file.saveTemp(buffer, `upload_${Date.now()}_${i}_${file.name}`);
        imagePaths.push(tempPath);
      }

      setGenerationStatus('Starting AI generation...');

      const result = await window.electronAPI.service.generate('basic-image-gen', {
        images: imagePaths,
        prompt: prompt.trim(),
      });

      if (result.success && result.images) {
        setGeneratedImages(result.images);
        setGenerationStatus('Generation complete!');

        // Auto-save to library if enabled
        try {
          const settings = await window.electronAPI.settings.get();
          if (settings.libraryAutoSave) {
            setGenerationStatus('Saving to library...');
            for (let i = 0; i < result.images.length; i++) {
              const imageData = result.images[i];
              const originalFilename = `generated_image_${Date.now()}_${i + 1}.png`;
              await window.electronAPI.library.add(imageData, prompt.trim(), originalFilename);
            }
            setGenerationStatus('Saved to library!');
          }
        } catch (libraryError) {
          console.warn('Failed to save to library:', libraryError);
          // Don't fail the whole generation for library save errors
        }
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationStatus('Generation failed');
      alert(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsInputCollapsed(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    if (lastGeneration) {
      createImagePreviews(lastGeneration.images);
      setPrompt(lastGeneration.prompt);
      handleGenerate();
    }
  };

  const handleReuse = () => {
    if (lastGeneration) {
      createImagePreviews(lastGeneration.images);
      setPrompt(lastGeneration.prompt);
    }
    setIsInputCollapsed(false);
    setGeneratedImages([]);
    setGenerationStatus('');
  };

  const handleClear = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    setPrompt('');
    setGeneratedImages([]);
    setGenerationStatus('');
    setIsInputCollapsed(false);
    setLastGeneration(null);
    setSelectedPreset(null);
  };

  const expandInput = () => {
    setIsInputCollapsed(false);
  };

  const saveImage = async (imageData: string, index: number) => {
    try {
      const filename = `generated_image_${Date.now()}_${index + 1}.png`;
      const savedPath = await window.electronAPI.file.saveImage(imageData, filename);
      alert(`Image saved to: ${savedPath}`);
    } catch (error) {
      console.error('Failed to save image:', error);
      alert('Failed to save image');
    }
  };

  const openImageModal = (imageData: string, index: number) => {
    setSelectedImageData(imageData);
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImageData('');
    setSelectedImageIndex(0);
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">

          {/* Collapsible header when generating */}
          {isInputCollapsed && (
            <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-2">
                    {imagePreviews.slice(0, 3).map((preview, index) => (
                      <img
                        key={index}
                        src={preview.url}
                        alt={`Upload ${index + 1}`}
                        className="w-8 h-8 rounded-full border-2 border-white object-cover"
                      />
                    ))}
                    {imagePreviews.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                        +{imagePreviews.length - 3}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {imagePreviews.length} image{imagePreviews.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 max-w-md truncate">
                      "{prompt}"
                    </p>
                  </div>
                </div>
                <button
                  onClick={expandInput}
                  className="px-3 py-1 text-sm text-primary border border-primary rounded hover:bg-primary/5 transition-colors"
                >
                  Expand
                </button>
              </div>
            </div>
          )}

          {/* Main input area */}
          <div className={`transition-all duration-300 ${isInputCollapsed ? 'hidden' : 'block'}`}>
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Generate Images</h1>

            {/* Enhanced drag & drop image upload area */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Images</h2>
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  isDragOver
                    ? 'border-primary bg-primary/5 scale-105'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className={`transition-colors ${isDragOver ? 'text-primary' : 'text-gray-500'}`}>
                    <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-sm font-medium">
                      {isDragOver ? 'Drop images here' : 'Click to upload images or drag and drop'}
                    </p>
                    <p className="text-xs mt-1 opacity-75">PNG, JPG, WebP up to 10MB</p>
                  </div>
                </label>
              </div>

              {/* Image previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-3">{imagePreviews.length} image{imagePreviews.length !== 1 ? 's' : ''} selected:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 flex items-center justify-center"
                        >
                          ×
                        </button>
                        <p className="text-xs text-gray-500 mt-1 truncate" title={preview.file.name}>
                          {preview.file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prompt input */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Prompt</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleGenerate();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Tip: Press Cmd/Ctrl + Enter to generate</p>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || selectedImages.length === 0}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? 'Generating...' : 'Generate Images'}
            </button>
          </div>

          {/* Loading animation */}
          {isGenerating && (
            <div className="mt-8 text-center">
              <LoadingSpinner />
              <div className="mt-4 p-3 bg-primary/10 text-primary rounded-lg text-sm max-w-md mx-auto">
                {generationStatus}
              </div>
            </div>
          )}

          {/* Generated images */}
          {generatedImages.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Generated Images</h2>
                <div className="flex space-x-2">
                  {lastGeneration && (
                    <>
                      <button
                        onClick={handleRetry}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Retry</span>
                      </button>
                      <button
                        onClick={handleReuse}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Reuse</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleClear}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generatedImages.map((imageData, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    <div className="relative cursor-pointer" onClick={() => openImageModal(imageData, index)}>
                      <img
                        src={imageData}
                        alt={`Generated image ${index + 1}`}
                        className="w-full h-auto hover:opacity-90 transition-opacity duration-200"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                        <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-white">
                      <button
                        onClick={() => saveImage(imageData, index)}
                        className="w-full bg-primary text-white py-2 px-4 rounded-lg text-sm hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>
                          {settings?.libraryAutoSave ? 'Download Copy' : 'Save Image'}
                        </span>
                      </button>
                      {settings?.libraryAutoSave && (
                        <p className="text-xs text-green-600 text-center mt-1">
                          ✓ Already in Library
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced collapsible presets panel */}
      <div className={`bg-white border-l border-gray-200 overflow-hidden transition-all duration-300 ease-in-out flex flex-col h-full ${
        isPanelCollapsed ? 'w-16' : 'w-80'
      }`}>
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          {!isPanelCollapsed && (
            <div className="flex items-center justify-between flex-1">
              <h3 className="text-lg font-medium text-gray-900 transition-opacity duration-200">
                Prompt Presets
              </h3>
              <button
                onClick={() => setIsPresetManagerOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-600 hover:text-gray-800"
                title="Manage presets"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>
            </div>
          )}
          <button
            onClick={togglePanel}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex-shrink-0"
            title={isPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
                isPanelCollapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Panel Content */}
        <div className={`flex flex-col h-full transition-opacity duration-300 ${isPanelCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {/* Tag Filter Section */}
          <div className="border-b border-gray-100 flex-shrink-0">
            {/* Tag Filter Header */}
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={toggleTagFilter}>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-700">Filter by Tags</h4>
                {selectedTags.length > 0 && (
                  <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">
                    {selectedTags.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedTags.length > 0 && !isTagFilterCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllTags();
                    }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    isTagFilterCollapsed ? 'rotate-0' : 'rotate-180'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Collapsed state - show selected tags */}
            {isTagFilterCollapsed && selectedTags.length > 0 && (
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTag(tag);
                        }}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Showing {filteredPresets.length} of {presets.length} presets
                </div>
              </div>
            )}

            {/* Expanded state - show all tags */}
            {!isTagFilterCollapsed && (
              <div className="p-4 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-all duration-200 hover:scale-105 ${
                        selectedTags.includes(tag)
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    Showing {filteredPresets.length} of {presets.length} presets
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Presets List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {filteredPresets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No presets match the selected tags</p>
                </div>
              ) : (
                filteredPresets.map((preset, index) => (
                  <div
                    key={index}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 ${
                      selectedPreset?.name === preset.name
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 mb-1">{preset.name}</h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {preset.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className={`inline-block text-xs px-2 py-0.5 rounded-full transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-primary/10 text-primary'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">{preset.prompt}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Collapsed state indicator */}
        {isPanelCollapsed && (
          <div className="p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Presets</div>
            <div className="w-8 h-8 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary text-xs font-medium">{presets.length}</span>
            </div>
            {selectedTags.length > 0 && (
              <div className="mt-1 w-2 h-2 bg-primary rounded-full mx-auto" title={`${selectedTags.length} tags selected`}></div>
            )}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={isModalOpen}
        imageData={selectedImageData}
        imageIndex={selectedImageIndex}
        onClose={closeImageModal}
        onDownload={saveImage}
      />

      {/* Preset Manager Modal */}
      <PresetManagerModal
        isOpen={isPresetManagerOpen}
        onClose={() => setIsPresetManagerOpen(false)}
        presets={presets}
        onPresetsUpdate={handlePresetsUpdate}
      />
    </div>
  );
};

export default Home;