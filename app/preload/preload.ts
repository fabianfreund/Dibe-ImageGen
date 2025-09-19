import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings, PromptPreset } from '../main/store';

export interface ElectronAPI {
  settings: {
    get: () => Promise<AppSettings>;
    save: (settings: Partial<AppSettings>) => Promise<void>;
  };
  presets: {
    get: () => Promise<PromptPreset[]>;
    save: (presets: PromptPreset[]) => Promise<void>;
  };
  apiKey: {
    get: () => Promise<string | null>;
    store: (apiKey: string) => Promise<void>;
    delete: () => Promise<void>;
    has: () => Promise<boolean>;
    test: () => Promise<{ success: boolean; error?: string }>;
  };
  file: {
    saveImage: (imageData: string, filename: string) => Promise<string>;
    selectDirectory: () => Promise<string | null>;
    selectJson: () => Promise<string | null>;
    saveTemp: (buffer: ArrayBuffer, filename: string) => Promise<string>;
  };
  service: {
    generate: (serviceId: string, params: any) => Promise<any>;
  };
}

const electronAPI: ElectronAPI = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', settings),
  },
  presets: {
    get: () => ipcRenderer.invoke('presets:get'),
    save: (presets: PromptPreset[]) => ipcRenderer.invoke('presets:save', presets),
  },
  apiKey: {
    get: () => ipcRenderer.invoke('api-key:get'),
    store: (apiKey: string) => ipcRenderer.invoke('api-key:store', apiKey),
    delete: () => ipcRenderer.invoke('api-key:delete'),
    has: () => ipcRenderer.invoke('api-key:has'),
    test: () => ipcRenderer.invoke('api-key:test'),
  },
  file: {
    saveImage: (imageData: string, filename: string) => ipcRenderer.invoke('file:save-image', imageData, filename),
    selectDirectory: () => ipcRenderer.invoke('file:select-directory'),
    selectJson: () => ipcRenderer.invoke('file:select-json'),
    saveTemp: (buffer: ArrayBuffer, filename: string) => ipcRenderer.invoke('file:save-temp', buffer, filename),
  },
  service: {
    generate: (serviceId: string, params: any) => ipcRenderer.invoke('service:generate', serviceId, params),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}