import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AppSettings {
  apiKey?: string;
  theme: 'light' | 'dark' | 'system';
  outputDirectory: string;
  imageFormat: 'png' | 'jpg' | 'webp';
  imageQuality: number;
  libraryAutoSave: boolean;
  libraryDownloadDirectory?: string;
}

export interface PromptPreset {
  name: string;
  tags: string[];
  prompt: string;
}

export interface LibraryItem {
  id: string;
  timestamp: number;
  prompt: string;
  imagePath: string;
  originalFilename: string;
  fileSize: number;
  imageFormat: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  outputDirectory: path.join(app.getPath('downloads'), 'DIBE-Imagine'),
  imageFormat: 'png',
  imageQuality: 90,
  libraryAutoSave: true,
  libraryDownloadDirectory: path.join(app.getPath('downloads'), 'DIBE-Imagine'),
};

let settings: AppSettings = { ...DEFAULT_SETTINGS };
let presets: PromptPreset[] = [];
let library: LibraryItem[] = [];

const getSettingsPath = (): string => {
  return path.join(app.getPath('userData'), 'settings.json');
};

const getPresetsPath = (): string => {
  return path.join(app.getPath('userData'), 'presets.json');
};

const getDefaultPresetsPath = (): string => {
  return path.join(__dirname, '../../presets/prompts.json');
};

const getLibraryPath = (): string => {
  return path.join(app.getPath('userData'), 'library.json');
};

const getLibraryDirectory = (): string => {
  return path.join(app.getPath('userData'), 'library');
};

export const initializeStore = async (): Promise<void> => {
  try {
    await loadSettings();
    await loadPresets();
    await loadLibrary();
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

export const loadLibrary = async (): Promise<LibraryItem[]> => {
  try {
    const libraryPath = getLibraryPath();
    const data = await fs.readFile(libraryPath, 'utf-8');
    library = JSON.parse(data);
  } catch (error) {
    library = [];
    await saveLibrary();
  }
  return library;
};

export const saveLibrary = async (newLibrary?: LibraryItem[]): Promise<void> => {
  if (newLibrary) {
    library = newLibrary;
  }

  const libraryPath = getLibraryPath();
  await fs.mkdir(path.dirname(libraryPath), { recursive: true });
  await fs.writeFile(libraryPath, JSON.stringify(library, null, 2));
};

export const addToLibrary = async (item: Omit<LibraryItem, 'id' | 'timestamp'>): Promise<LibraryItem> => {
  const newItem: LibraryItem = {
    ...item,
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
  };

  // Ensure library directory exists
  const libraryDir = getLibraryDirectory();
  await fs.mkdir(libraryDir, { recursive: true });

  library.unshift(newItem); // Add to beginning (newest first)
  await saveLibrary();
  return newItem;
};

export const removeFromLibrary = async (id: string): Promise<boolean> => {
  const index = library.findIndex(item => item.id === id);
  if (index === -1) {
    return false;
  }

  const item = library[index];

  // Remove the image file
  try {
    await fs.unlink(item.imagePath);
  } catch (error) {
    console.warn('Failed to delete image file:', error);
  }

  library.splice(index, 1);
  await saveLibrary();
  return true;
};

export const getLibrary = (): LibraryItem[] => library;
export const getLibraryDirectoryPath = (): string => getLibraryDirectory();