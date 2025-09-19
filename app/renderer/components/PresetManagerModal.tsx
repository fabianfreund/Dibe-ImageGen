import React, { useState, useEffect } from 'react';

interface PromptPreset {
  name: string;
  tags: string[];
  prompt: string;
}

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: PromptPreset[];
  onPresetsUpdate: (presets: PromptPreset[]) => void;
}

const PresetManagerModal: React.FC<PresetManagerModalProps> = ({
  isOpen,
  onClose,
  presets,
  onPresetsUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'json'>('list');
  const [editingPreset, setEditingPreset] = useState<PromptPreset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    tags: '',
    prompt: ''
  });

  useEffect(() => {
    if (isOpen) {
      setJsonText(JSON.stringify(presets, null, 2));
      setJsonError('');
    }
  }, [isOpen, presets]);

  useEffect(() => {
    if (editingPreset) {
      setFormData({
        name: editingPreset.name,
        tags: editingPreset.tags.join(', '),
        prompt: editingPreset.prompt
      });
    } else if (isCreating) {
      setFormData({
        name: '',
        tags: '',
        prompt: ''
      });
    }
  }, [editingPreset, isCreating]);

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
    setEditingPreset(null);
    setIsCreating(false);
    setFormData({ name: '', tags: '', prompt: '' });
  };

  const handleSavePreset = () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      alert('Name and prompt are required');
      return;
    }

    const newPreset: PromptPreset = {
      name: formData.name.trim(),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      prompt: formData.prompt.trim()
    };

    let updatedPresets: PromptPreset[];

    if (isCreating) {
      updatedPresets = [...presets, newPreset];
    } else if (editingPreset) {
      updatedPresets = presets.map(preset =>
        preset === editingPreset ? newPreset : preset
      );
    } else {
      return;
    }

    onPresetsUpdate(updatedPresets);
    resetForm();
  };

  const handleDeletePreset = (presetToDelete: PromptPreset) => {
    if (confirm(`Are you sure you want to delete "${presetToDelete.name}"?`)) {
      const updatedPresets = presets.filter(preset => preset !== presetToDelete);
      onPresetsUpdate(updatedPresets);
      resetForm();
    }
  };

  const handleDuplicatePreset = (presetToDuplicate: PromptPreset) => {
    const duplicatedPreset: PromptPreset = {
      ...presetToDuplicate,
      name: `${presetToDuplicate.name} (Copy)`
    };
    const updatedPresets = [...presets, duplicatedPreset];
    onPresetsUpdate(updatedPresets);
  };

  const handleJsonImport = () => {
    try {
      const parsedPresets = JSON.parse(jsonText);

      if (!Array.isArray(parsedPresets)) {
        throw new Error('JSON must be an array of presets');
      }

      // Validate preset structure
      for (const preset of parsedPresets) {
        if (!preset.name || !preset.prompt || !Array.isArray(preset.tags)) {
          throw new Error('Invalid preset structure. Each preset must have name, prompt, and tags array');
        }
      }

      onPresetsUpdate(parsedPresets);
      setJsonError('');
      alert('Presets imported successfully!');
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  const handleJsonImportFromFile = async () => {
    try {
      const fileContent = await window.electronAPI.file.selectJson();
      if (fileContent) {
        setJsonText(fileContent);
        setJsonError('');
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Failed to load file');
    }
  };

  const handleJsonExport = () => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const isEditing = editingPreset || isCreating;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Manage Presets</h2>
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
            Edit Presets
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
                    {isCreating ? 'Create New Preset' : 'Edit Preset'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter preset name"
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
                        placeholder="food, studio, beige, advertising"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prompt
                      </label>
                      <textarea
                        value={formData.prompt}
                        onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                        rows={6}
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter your detailed prompt..."
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={handleSavePreset}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isCreating ? 'Create Preset' : 'Save Changes'}
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
                  <h3 className="text-lg font-medium text-gray-900">Current Presets ({presets.length})</h3>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add New Preset</span>
                  </button>
                </div>
              )}

              {/* Presets List */}
              {!isEditing && (
                <div className="space-y-3">
                  {presets.map((preset, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">{preset.name}</h4>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {preset.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-block text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-3">{preset.prompt}</p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => setEditingPreset(preset)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit preset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDuplicatePreset(preset)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Duplicate preset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeletePreset(preset)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete preset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {presets.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No presets found. Create your first preset!</p>
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
                  <div className="flex flex-col items-end space-y-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={handleJsonExport}
                        className="p-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                        title="Export presets to JSON file"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={handleJsonImportFromFile}
                        className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                        title="Import presets from JSON file"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 flex space-x-8">
                      <span>Export</span>
                      <span>Import</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Presets JSON
                  </label>
                  <textarea
                    value={jsonText}
                    readOnly
                    rows={20}
                    className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none bg-gray-50 text-gray-700"
                    placeholder="Your presets will appear here..."
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    This shows your current presets in JSON format. Use the buttons above to export or import preset files.
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Expected JSON Format:</h4>
                  <pre className="text-xs text-blue-800 overflow-x-auto">
{`[
  {
    "name": "Preset Name",
    "tags": ["tag1", "tag2", "tag3"],
    "prompt": "Your detailed prompt here..."
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

export default PresetManagerModal;