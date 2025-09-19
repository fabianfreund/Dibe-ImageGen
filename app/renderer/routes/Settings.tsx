import React, { useState, useEffect } from 'react';

interface AppSettings {
  apiKey?: string;
  theme: 'light' | 'dark' | 'system';
  outputDirectory: string;
  imageFormat: 'png' | 'jpg' | 'webp';
  imageQuality: number;
}

interface PromptPreset {
  name: string;
  tags: string[];
  prompt: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [, setPresets] = useState<PromptPreset[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [presetsJson, setPresetsJson] = useState('');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);

  useEffect(() => {
    const initializeSettings = async () => {
      await loadSettings();
      await loadPresets();
      await checkStoredApiKey();
    };
    initializeSettings();
  }, []);

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
      setPresetsJson(JSON.stringify(loadedPresets, null, 2));
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

  const savePresets = async () => {
    try {
      const parsedPresets = JSON.parse(presetsJson);
      await window.electronAPI.presets.save(parsedPresets);
      alert('Presets saved successfully');
    } catch (error) {
      console.error('Failed to save presets:', error);
      alert('Failed to save presets. Please check JSON format.');
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Save API Key
              </button>
              <button
                onClick={testApiKey}
                disabled={!hasStoredApiKey || isTestingApiKey}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 text-sm"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
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

        {/* Prompt Presets */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Prompt Presets</h2>

          <div className="mb-4">
            <textarea
              value={presetsJson}
              onChange={(e) => setPresetsJson(e.target.value)}
              className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Edit your prompt presets in JSON format..."
            />
          </div>

          <button
            onClick={savePresets}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Save Presets
          </button>

          <p className="text-sm text-gray-500 mt-2">
            Edit the JSON to customize your prompt presets. Each preset should have a name, tags array, and prompt string.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;