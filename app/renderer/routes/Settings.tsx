import React, { useState, useEffect } from 'react';
import PresetManagerModal from '../components/PresetManagerModal';

interface AppSettings {
  apiKey?: string;
  theme: 'light' | 'dark' | 'system';
  outputDirectory: string;
  imageFormat: 'png' | 'jpg' | 'webp';
  imageQuality: number;
  libraryAutoSave: boolean;
  libraryDownloadDirectory?: string;
}

interface PromptPreset {
  name: string;
  tags: string[];
  prompt: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);

  useEffect(() => {
    const initializeSettings = async () => {
      await loadSettings();
      await loadPresets();
      await checkStoredApiKey();
    };
    initializeSettings();
  }, [showApiKey]);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.settings.get();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const loadedPresets = await window.electronAPI.presets.get();
      setPresets(loadedPresets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const checkStoredApiKey = async () => {
    try {
      const hasKey = await window.electronAPI.apiKey.has();
      setHasStoredApiKey(hasKey);
      if (hasKey && showApiKey) {
        const key = await window.electronAPI.apiKey.get();
        setApiKey(key || '');
      }
    } catch (error) {
      console.error('Failed to check stored API key:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      await window.electronAPI.settings.save(newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const saveApiKey = async () => {
    try {
      if (apiKey.trim()) {
        await window.electronAPI.apiKey.store(apiKey.trim());
        setHasStoredApiKey(true);
        alert('API key saved successfully');
      } else {
        await window.electronAPI.apiKey.delete();
        setHasStoredApiKey(false);
        alert('API key removed');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      alert('Failed to save API key');
    }
  };

  const testApiKey = async () => {
    setIsTestingApiKey(true);
    try {
      const result = await window.electronAPI.apiKey.test();
      if (result.success) {
        alert('API key test successful! Your key is valid and working.');
      } else {
        alert(`API key test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('API key test failed:', error);
      alert('API key test failed: Network error');
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handlePresetsUpdate = async (updatedPresets: PromptPreset[]) => {
    try {
      await window.electronAPI.presets.save(updatedPresets);
      setPresets(updatedPresets);
    } catch (error) {
      console.error('Failed to save presets:', error);
      alert('Failed to save presets');
    }
  };

  const selectOutputDirectory = async () => {
    try {
      const directory = await window.electronAPI.file.selectDirectory();
      if (directory && settings) {
        await saveSettings({ outputDirectory: directory });
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      alert('Failed to select directory');
    }
  };

  const selectLibraryDownloadDirectory = async () => {
    try {
      const directory = await window.electronAPI.file.selectDirectory();
      if (directory && settings) {
        await saveSettings({ libraryDownloadDirectory: directory });
      }
    } catch (error) {
      console.error('Failed to select library download directory:', error);
      alert('Failed to select directory');
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* API Key Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Gemini API Key</h2>

          <div className="mb-4">
            <div className="flex items-center space-x-4 mb-3">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasStoredApiKey ? 'API key is stored securely' : 'Enter your Gemini API key'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={saveApiKey}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
              >
                Save API Key
              </button>
              <button
                onClick={testApiKey}
                disabled={!hasStoredApiKey || isTestingApiKey}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
              >
                {isTestingApiKey ? 'Testing...' : 'Test API Key'}
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Your API key is stored securely in the system keychain. Get your key from the{' '}
            <a href="#" className="text-blue-600 hover:underline">Google AI Studio</a>.
          </p>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">General Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => saveSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Output Directory</label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={settings.outputDirectory}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <button
                  onClick={selectOutputDirectory}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                >
                  Browse
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image Format</label>
              <select
                value={settings.imageFormat}
                onChange={(e) => saveSettings({ imageFormat: e.target.value as 'png' | 'jpg' | 'webp' })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="png">PNG</option>
                <option value="jpg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Quality ({settings.imageQuality}%)
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.imageQuality}
                onChange={(e) => saveSettings({ imageQuality: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Library Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Library Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Auto-save generated images</h3>
                <p className="text-sm text-gray-500">Automatically save all generated images to your library</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.libraryAutoSave}
                  onChange={(e) => saveSettings({ libraryAutoSave: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default download directory for library images
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={settings.libraryDownloadDirectory || settings.outputDirectory}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <button
                  onClick={selectLibraryDownloadDirectory}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                >
                  Browse
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This is the default location when downloading images from your library. You can still choose a different location for each download.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">About the Library</h3>
                  <div className="mt-1 text-sm text-blue-800">
                    <p>Your library stores generated images locally on your device. Each image is saved with its generation prompt and metadata. You can view, download, or remove images from the Library tab.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Presets */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Prompt Presets</h2>
            <button
              onClick={() => setIsPresetManagerOpen(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <span>Manage Presets</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presets.slice(0, 6).map((preset, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <h4 className="font-medium text-gray-900 mb-2 truncate">{preset.name}</h4>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {preset.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="inline-block text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {preset.tags.length > 3 && (
                      <span className="inline-block text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        +{preset.tags.length - 3}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{preset.prompt}</p>
                </div>
              ))}
            </div>

            {presets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No presets found. Click "Manage Presets" to get started!</p>
              </div>
            )}

            {presets.length > 6 && (
              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3">
                  Showing 6 of {presets.length} presets
                </p>
                <button
                  onClick={() => setIsPresetManagerOpen(true)}
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                >
                  View all presets →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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

export default Settings;