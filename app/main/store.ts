import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AppSettings {
  apiKey?: string;
  theme: 'light' | 'dark' | 'system';
  outputDirectory: string;
  imageFormat: 'png' | 'jpg' | 'webp';
  imageQuality: number;
}

export interface PromptPreset {
  name: string;
  tags: string[];
  prompt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  outputDirectory: path.join(app.getPath('downloads'), 'DIBE-Imagine'),
  imageFormat: 'png',
  imageQuality: 90,
};

let settings: AppSettings = { ...DEFAULT_SETTINGS };
let presets: PromptPreset[] = [];

const getSettingsPath = (): string => {
  return path.join(app.getPath('userData'), 'settings.json');
};

const getPresetsPath = (): string => {
  return path.join(app.getPath('userData'), 'presets.json');
};

const getDefaultPresetsPath = (): string => {
  return path.join(__dirname, '../../presets/prompts.json');
};

export const initializeStore = async (): Promise<void> => {
  try {
    await loadSettings();
    await loadPresets();
  } catch (error) {
    console.error('Failed to initialize store:', error);
  }
};

export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const settingsPath = getSettingsPath();
    const data = await fs.readFile(settingsPath, 'utf-8');
    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    settings = { ...DEFAULT_SETTINGS };
    await saveSettings();
  }
  return settings;
};

export const saveSettings = async (newSettings?: Partial<AppSettings>): Promise<void> => {
  if (newSettings) {
    settings = { ...settings, ...newSettings };
  }

  const settingsPath = getSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
};

export const loadPresets = async (): Promise<PromptPreset[]> => {
  try {
    const presetsPath = getPresetsPath();
    const data = await fs.readFile(presetsPath, 'utf-8');
    presets = JSON.parse(data);
  } catch (error) {
    try {
      const defaultPresetsPath = getDefaultPresetsPath();
      const defaultData = await fs.readFile(defaultPresetsPath, 'utf-8');
      presets = JSON.parse(defaultData);
      await savePresets();
    } catch (defaultError) {
      presets = [];
      await savePresets();
    }
  }
  return presets;
};

export const savePresets = async (newPresets?: PromptPreset[]): Promise<void> => {
  if (newPresets) {
    presets = newPresets;
  }

  const presetsPath = getPresetsPath();
  await fs.mkdir(path.dirname(presetsPath), { recursive: true });
  await fs.writeFile(presetsPath, JSON.stringify(presets, null, 2));
};

export const getSettings = (): AppSettings => settings;
export const getPresets = (): PromptPreset[] => presets;