import React, { useState, useEffect, useRef } from 'react';

interface ThumbnailTemplate {
  id: string;
  name: string;
  tags: string[];
  description?: string;
  templateImagePath: string;
  basePrompt: string;
  thumbnail?: string;
}

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ThumbnailTemplate[];
  onTemplatesUpdate: (templates: ThumbnailTemplate[]) => void;
}

const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onTemplatesUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'json'>('list');
  const [editingTemplate, setEditingTemplate] = useState<ThumbnailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    tags: '',
    description: '',
    basePrompt: ''
  });

  useEffect(() => {
    if (isOpen) {
      setJsonText(JSON.stringify(templates, null, 2));
      setJsonError('');
    }
  }, [isOpen, templates]);

  useEffect(() => {
    const loadTemplateImage = async () => {
      if (editingTemplate) {
        setFormData({
          name: editingTemplate.name,
          tags: editingTemplate.tags.join(', '),
          description: editingTemplate.description || '',
          basePrompt: editingTemplate.basePrompt
        });

        // Load existing template image for preview
        try {
          const imageData = await window.electronAPI.templates.getImage(editingTemplate.templateImagePath);
          setTemplateImage(imageData);
        } catch (error) {
          console.error('Failed to load template image:', error);
          setTemplateImage(null);
        }
      } else if (isCreating) {
        setFormData({
          name: '',
          tags: '',
          description: '',
          basePrompt: ''
        });
        setTemplateImage(null);
      }
    };

    loadTemplateImage();
  }, [editingTemplate, isCreating]);

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

  const resetForm = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setFormData({ name: '', tags: '', description: '', basePrompt: '' });
    setTemplateImage(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTemplateImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTemplateImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim() || !formData.basePrompt.trim()) {
      alert('Name and base prompt are required');
      return;
    }

    if (isCreating && !templateImage) {
      alert('Template image is required for new templates');
      return;
    }

    try {
      let imagePath = editingTemplate?.templateImagePath || '';

      // Upload new image if provided (user uploaded a new one or changed it)
      // Check if templateImage is different from the loaded one (starts with 'data:' means it's new upload)
      if (templateImage && (isCreating || !editingTemplate || !templateImage.includes(editingTemplate.templateImagePath))) {
        const filename = `${Date.now()}_${formData.name.replace(/\s+/g, '_')}.png`;
        imagePath = await window.electronAPI.templates.uploadImage(templateImage, filename);
      } else if (editingTemplate && !templateImage) {
        // If editing and no template image, keep the existing path
        imagePath = editingTemplate.templateImagePath;
      }

      const newTemplate: ThumbnailTemplate = {
        id: editingTemplate?.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name.trim(),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        description: formData.description.trim() || undefined,
        templateImagePath: imagePath,
        basePrompt: formData.basePrompt.trim()
      };

      let updatedTemplates: ThumbnailTemplate[];

      if (isCreating) {
        updatedTemplates = [...templates, newTemplate];
      } else if (editingTemplate) {
        updatedTemplates = templates.map(template =>
          template === editingTemplate ? newTemplate : template
        );
      } else {
        return;
      }

      await onTemplatesUpdate(updatedTemplates);
      resetForm();
    } catch (error) {
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteTemplate = async (templateToDelete: ThumbnailTemplate) => {
    if (confirm(`Are you sure you want to delete "${templateToDelete.name}"?`)) {
      try {
        // Delete the image file if it's a user template
        if (templateToDelete.templateImagePath.includes('userData')) {
          await window.electronAPI.templates.deleteImage(templateToDelete.id);
        }

        const updatedTemplates = templates.filter(template => template !== templateToDelete);
        await onTemplatesUpdate(updatedTemplates);
        resetForm();
      } catch (error) {
        alert(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleDuplicateTemplate = (templateToDuplicate: ThumbnailTemplate) => {
    const duplicatedTemplate: ThumbnailTemplate = {
      ...templateToDuplicate,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${templateToDuplicate.name} (Copy)`
    };
    const updatedTemplates = [...templates, duplicatedTemplate];
    onTemplatesUpdate(updatedTemplates);
  };

  const handleJsonImport = () => {
    try {
      const parsedTemplates = JSON.parse(jsonText);

      if (!Array.isArray(parsedTemplates)) {
        throw new Error('JSON must be an array of templates');
      }

      // Validate template structure
      for (const template of parsedTemplates) {
        if (!template.id || !template.name || !template.basePrompt || !Array.isArray(template.tags) || !template.templateImagePath) {
          throw new Error('Invalid template structure. Each template must have id, name, basePrompt, tags array, and templateImagePath');
        }
      }

      onTemplatesUpdate(parsedTemplates);
      setJsonError('');
      alert('Templates imported successfully!');
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  const handleJsonExport = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thumbnail-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const isEditing = editingTemplate || isCreating;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Manage Thumbnail Templates</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Edit Templates
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Import/Export JSON
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'list' && (
            <div className="space-y-6">
              {/* Create/Edit Form */}
              {isEditing && (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {isCreating ? 'Create New Template' : 'Edit Template'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Image {isCreating && <span className="text-red-500">*</span>}
                      </label>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        {templateImage ? (
                          <div className="relative">
                            <img src={templateImage} alt="Template preview" className="max-h-48 mx-auto rounded" />
                            <p className="mt-2 text-sm text-gray-500">Click or drag to replace</p>
                          </div>
                        ) : editingTemplate ? (
                          <p className="text-sm text-gray-500">Click or drag to replace current image</p>
                        ) : (
                          <div>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500">Click or drag image here</p>
                            <p className="text-xs text-gray-400">Recommended: 1920x1080 or 1280x720</p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Gaming Action Shot"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="gaming, action, colorful"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Bold text overlay with dramatic background"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base Prompt <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.basePrompt}
                        onChange={(e) => setFormData(prev => ({ ...prev, basePrompt: e.target.value }))}
                        rows={6}
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Create an eye-catching YouTube gaming thumbnail with the template layout. Use vibrant colors..."
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={handleSaveTemplate}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isCreating ? 'Create Template' : 'Save Changes'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isEditing && (
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Current Templates ({templates.length})</h3>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add New Template</span>
                  </button>
                </div>
              )}

              {/* Templates List */}
              {!isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template, index) => (
                    <div
                      key={template.id || index}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-32 h-18 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                          {template.thumbnail ? (
                            <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {template.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-block text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => setEditingTemplate(template)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit template"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Duplicate template"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete template"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {templates.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>No templates found. Create your first template!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">JSON Import/Export</h3>
                  <button
                    onClick={handleJsonExport}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export to File</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Edit Templates JSON
                  </label>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={20}
                    className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Your templates will appear here..."
                  />
                  {jsonError && (
                    <p className="mt-2 text-sm text-red-600">
                      Error: {jsonError}
                    </p>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleJsonImport}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Import JSON
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Expected JSON Format:</h4>
                  <pre className="text-xs text-blue-800 overflow-x-auto">
{`[
  {
    "id": "template_123",
    "name": "Template Name",
    "tags": ["tag1", "tag2"],
    "description": "Optional description",
    "templateImagePath": "/path/to/image.png",
    "basePrompt": "Your base prompt here..."
  }
]`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateManagerModal;
