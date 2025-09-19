import { ipcMain, dialog } from 'electron';
import { getSettings, saveSettings, getPresets, savePresets, AppSettings, PromptPreset } from './store';
import { getApiKey, storeApiKey, deleteApiKey, hasStoredApiKey } from './secrets';
import { mainWindow } from './main';
import * as fs from 'fs/promises';

export const setupIPC = (): void => {
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return getSettings();
  });

  ipcMain.handle('settings:save', async (_, settings: Partial<AppSettings>): Promise<void> => {
    await saveSettings(settings);
  });

  ipcMain.handle('presets:get', async (): Promise<PromptPreset[]> => {
    return getPresets();
  });

  ipcMain.handle('presets:save', async (_, presets: PromptPreset[]): Promise<void> => {
    await savePresets(presets);
  });

  ipcMain.handle('api-key:get', async (): Promise<string | null> => {
    return await getApiKey();
  });

  ipcMain.handle('api-key:store', async (_, apiKey: string): Promise<void> => {
    await storeApiKey(apiKey);
  });

  ipcMain.handle('api-key:delete', async (): Promise<void> => {
    await deleteApiKey();
  });

  ipcMain.handle('api-key:has', async (): Promise<boolean> => {
    return await hasStoredApiKey();
  });

  ipcMain.handle('file:save-image', async (_, imageData: string, filename: string): Promise<string> => {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Generated Image',
      defaultPath: filename,
      filters: [
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
        { name: 'WebP Images', extensions: ['webp'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      throw new Error('Save dialog was cancelled');
    }

    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    await fs.writeFile(result.filePath, buffer);
    return result.filePath;
  });

  ipcMain.handle('file:select-directory', async (): Promise<string | null> => {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Output Directory',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('service:generate', async (_, serviceId: string, params: any): Promise<any> => {
    // This will be handled by the service worker system
    // For now, return a placeholder
    return { status: 'not_implemented', serviceId, params };
  });
};