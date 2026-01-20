import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings, PromptPreset, ThumbnailTemplate, LibraryItem } from '../main/store';

export interface ElectronAPI {
  settings: {
    get: () => Promise<AppSettings>;
    save: (settings: Partial<AppSettings>) => Promise<void>;
  };
  presets: {
    get: () => Promise<PromptPreset[]>;
    save: (presets: PromptPreset[]) => Promise<void>;
  };
  templates: {
    get: () => Promise<ThumbnailTemplate[]>;
    save: (templates: ThumbnailTemplate[]) => Promise<void>;
    uploadImage: (imageData: string, filename: string) => Promise<string>;
    deleteImage: (templateId: string) => Promise<void>;
    getImage: (templateImagePath: string) => Promise<string | null>;
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
  library: {
    get: () => Promise<LibraryItem[]>;
    add: (imageData: string, prompt: string, originalFilename: string) => Promise<LibraryItem>;
    remove: (id: string) => Promise<boolean>;
    download: (id: string, suggestedFilename?: string) => Promise<string>;
    getImageData: (id: string) => Promise<string>;
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
  templates: {
    get: () => ipcRenderer.invoke('templates:get'),
    save: (templates: ThumbnailTemplate[]) => ipcRenderer.invoke('templates:save', templates),
    uploadImage: (imageData: string, filename: string) => ipcRenderer.invoke('templates:upload-image', imageData, filename),
    deleteImage: (templateId: string) => ipcRenderer.invoke('templates:delete-image', templateId),
    getImage: (templateImagePath: string) => ipcRenderer.invoke('templates:get-image', templateImagePath),
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
  library: {
    get: () => ipcRenderer.invoke('library:get'),
    add: (imageData: string, prompt: string, originalFilename: string) => ipcRenderer.invoke('library:add', imageData, prompt, originalFilename),
    remove: (id: string) => ipcRenderer.invoke('library:remove', id),
    download: (id: string, suggestedFilename?: string) => ipcRenderer.invoke('library:download', id, suggestedFilename),
    getImageData: (id: string) => ipcRenderer.invoke('library:get-image-data', id),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}