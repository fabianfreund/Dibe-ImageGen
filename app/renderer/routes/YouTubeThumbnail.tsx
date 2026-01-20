import React, { useState, useEffect, useRef } from 'react';
import TemplateManagerModal from '../components/TemplateManagerModal';
import ImagePreviewModal from '../components/ImagePreviewModal';

interface ThumbnailTemplate {
  id: string;
  name: string;
  tags: string[];
  description?: string;
  templateImagePath: string;
  basePrompt: string;
  thumbnail?: string;
}

interface ImagePreview {
  file: File;
  preview: string;
}

interface AppSettings {
  libraryAutoSave: boolean;
}

const YouTubeThumbnail: React.FC = () => {
  const [templates, setTemplates] = useState<ThumbnailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ThumbnailTemplate | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<ImagePreview[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isTemplatePanelCollapsed, setIsTemplatePanelCollapsed] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load templates and settings on mount
  useEffect(() => {
    loadTemplates();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.settings.get();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await window.electronAPI.templates.get();
      setTemplates(loadedTemplates);

      // Extract unique tags
      const allTags = loadedTemplates.flatMap((t: ThumbnailTemplate) => t.tags);
      const uniqueTags = Array.from(new Set(allTags));
      setAvailableTags(uniqueTags);
    } catch (error) {
      console.error('Failed to load templates:', error);
      alert('Failed to load templates. Please try again.');
    }
  };

  const handleTemplatesUpdate = async (updatedTemplates: ThumbnailTemplate[]) => {
    try {
      await window.electronAPI.templates.save(updatedTemplates);
      setTemplates(updatedTemplates);

      // Update available tags
      const allTags = updatedTemplates.flatMap((t: ThumbnailTemplate) => t.tags);
      setAvailableTags(Array.from(new Set(allTags)));
    } catch (error) {
      console.error('Failed to save templates:', error);
      alert('Failed to save templates. Please try again.');
    }
  };

  const handleTemplateSelect = (template: ThumbnailTemplate) => {
    setSelectedTemplate(template);
    // Optionally pre-fill the prompt with the template's base prompt
    if (!userPrompt) {
      setUserPrompt(template.basePrompt);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addReferenceImages(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    addReferenceImages(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const addReferenceImages = (files: File[]) => {
    const newPreviews: ImagePreview[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setReferenceImages(prev => [...prev, ...newPreviews]);
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }

    if (!userPrompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGeneratedThumbnails([]);

    try {
      // Save reference images to temp directory
      const referencePaths: string[] = [];
      for (const imagePreview of referenceImages) {
        const buffer = await imagePreview.file.arrayBuffer();
        const tempPath = await window.electronAPI.file.saveTemp(buffer, imagePreview.file.name);
        referencePaths.push(tempPath);
      }

      // Call youtube-thumbnail-gen service
      const result = await window.electronAPI.service.generate('youtube-thumbnail-gen', {
        templateImage: selectedTemplate.templateImagePath,
        referenceImages: referencePaths,
        prompt: userPrompt.trim(),
      });

      if (result.success && result.images) {
        setGeneratedThumbnails(result.images);

        // Auto-save to library if enabled
        if (settings?.libraryAutoSave) {
          for (const imageData of result.images) {
            await window.electronAPI.library.add(
              imageData,
              `Template: ${selectedTemplate.name}. ${userPrompt}`,
              `thumbnail_${Date.now()}.png`
            );
          }
        }
      } else {
        alert(result.error || 'Failed to generate thumbnail');
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveImage = async (imageData: string, index: number) => {
    try {
      const filename = `youtube_thumbnail_${Date.now()}_${index + 1}.png`;
      await window.electronAPI.file.saveImage(imageData, filename);
    } catch (error) {
      console.error('Failed to save image:', error);
      alert('Failed to save image. Please try again.');
    }
  };

  const handleReuse = () => {
    // Keep everything the same, just allow user to modify and regenerate
    setGeneratedThumbnails([]);
  };

  const handleClear = () => {
    setSelectedTemplate(null);
    setReferenceImages([]);
    setUserPrompt('');
    setGeneratedThumbnails([]);
  };

  // Filter templates by selected tags
  const filteredTemplates =
    selectedTags.length === 0
      ? templates
      : templates.filter(template =>
          selectedTags.every(tag => template.tags.includes(tag))
        );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">YouTube Thumbnail Generator</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create eye-catching thumbnails using AI-powered templates
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Template Selection Card */}
            {!selectedTemplate && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Select a Template</h2>
                  <button
                    onClick={() => setIsTemplateManagerOpen(true)}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Manage Templates
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">Choose a template to get started</p>
                <div className="text-center py-8 text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  <p>Select a template from the right panel to begin</p>
                </div>
              </div>
            )}

            {/* Selected Template Card */}
            {selectedTemplate && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h2>
                    {selectedTemplate.description && (
                      <p className="text-sm text-gray-500 mt-1">{selectedTemplate.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedTemplate.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Reference Images Upload */}
            {selectedTemplate && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Reference Images <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </h2>

                <div
                  ref={dropZoneRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Drag and drop images here, or click to select</p>
                  <p className="text-xs text-gray-400 mt-1">Add images for inspiration and content reference</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {referenceImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    {referenceImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.preview}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeReferenceImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prompt Input */}
            {selectedTemplate && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customize Prompt</h2>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add custom instructions or modify the template prompt..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  This will be combined with the template's base prompt to generate your thumbnail
                </p>
              </div>
            )}

            {/* Generate Button */}
            {selectedTemplate && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !userPrompt.trim()}
                className="w-full bg-primary text-white py-4 rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] font-semibold text-lg"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating Thumbnail...
                  </span>
                ) : (
                  'Generate YouTube Thumbnail'
                )}
              </button>
            )}

            {/* Generated Thumbnails */}
            {generatedThumbnails.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Thumbnails</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedThumbnails.map((imageData, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageData}
                        alt={`Generated thumbnail ${index + 1}`}
                        className="w-full rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setPreviewImageIndex(index)}
                      />
                      <button
                        onClick={() => saveImage(imageData, index)}
                        className="absolute bottom-2 right-2 bg-primary text-white px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleReuse}
                    className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Generate Again
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Selection Panel (Right Sidebar) */}
      <div
        className={`bg-white border-l border-gray-200 transition-all duration-300 ${
          isTemplatePanelCollapsed ? 'w-16' : 'w-80'
        } flex flex-col overflow-hidden`}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isTemplatePanelCollapsed && (
            <h3 className="font-semibold text-gray-900">Templates</h3>
          )}
          <button
            onClick={() => setIsTemplatePanelCollapsed(!isTemplatePanelCollapsed)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isTemplatePanelCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {!isTemplatePanelCollapsed && (
          <>
            {/* Tag Filters */}
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Tags</h4>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                    {template.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{template.tags.length - 3}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No templates found</p>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-xs text-primary hover:underline mt-2"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Manage Templates Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setIsTemplateManagerOpen(true)}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Manage Templates
              </button>
            </div>
          </>
        )}

        {isTemplatePanelCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center p-2">
            <span className="text-xs text-gray-500 writing-mode-vertical">
              {filteredTemplates.length} templates
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        templates={templates}
        onTemplatesUpdate={handleTemplatesUpdate}
      />

      {previewImageIndex !== null && generatedThumbnails[previewImageIndex] && (
        <ImagePreviewModal
          isOpen={true}
          imageData={generatedThumbnails[previewImageIndex]}
          imageIndex={previewImageIndex}
          onClose={() => setPreviewImageIndex(null)}
          onDownload={(imageData, index) => saveImage(imageData, index)}
          prompt={userPrompt}
        />
      )}
    </div>
  );
};

export default YouTubeThumbnail;
