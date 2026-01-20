import { ipcMain, dialog } from 'electron';
import { getSettings, saveSettings, getPresets, savePresets, AppSettings, PromptPreset, getTemplates, saveTemplates, ThumbnailTemplate, getTemplatesDirectoryPath, getLibrary, addToLibrary, removeFromLibrary, LibraryItem, getLibraryDirectoryPath } from './store';
import { getApiKey, storeApiKey, deleteApiKey, hasStoredApiKey } from './secrets';
import { mainWindow } from './main';
import { ServiceManager } from '../services/core/ServiceManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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

  ipcMain.handle('templates:get', async (): Promise<ThumbnailTemplate[]> => {
    return getTemplates();
  });

  ipcMain.handle('templates:save', async (_, templates: ThumbnailTemplate[]): Promise<void> => {
    await saveTemplates(templates);
  });

  ipcMain.handle('templates:upload-image', async (_, imageData: string, filename: string): Promise<string> => {
    const templatesDir = getTemplatesDirectoryPath();
    await fs.mkdir(templatesDir, { recursive: true });

    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const filePath = path.join(templatesDir, filename);
    await fs.writeFile(filePath, buffer);

    return filePath;
  });

  ipcMain.handle('templates:delete-image', async (_, templateId: string): Promise<void> => {
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);

    if (template && template.templateImagePath.includes('userData')) {
      try {
        await fs.unlink(template.templateImagePath);
      } catch (error) {
        console.warn('Failed to delete template image:', error);
      }
    }
  });

  ipcMain.handle('templates:get-image', async (_, templateImagePath: string): Promise<string | null> => {
    try {
      const buffer = await fs.readFile(templateImagePath);
      const base64 = buffer.toString('base64');
      // Detect image type from extension or default to png
      const ext = path.extname(templateImagePath).toLowerCase();
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                       ext === '.webp' ? 'image/webp' : 'image/png';
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.warn('Failed to read template image:', error);
      return null;
    }
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

  ipcMain.handle('file:select-json', async (): Promise<string | null> => {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select JSON File',
      properties: ['openFile'],
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    try {
      const content = await fs.readFile(result.filePaths[0], 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('file:save-temp', async (_, buffer: ArrayBuffer, filename: string): Promise<string> => {
    try {
      const tempDir = path.join(os.tmpdir(), 'dibe-image-gen');
      await fs.mkdir(tempDir, { recursive: true });

      const tempPath = path.join(tempDir, filename);
      await fs.writeFile(tempPath, Buffer.from(buffer));

      return tempPath;
    } catch (error) {
      throw new Error(`Failed to save temporary file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('service:generate', async (_, serviceId: string, params: any): Promise<any> => {
    try {
      const serviceManager = ServiceManager.getInstance();

      // Get API key from secure storage
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('No API key found. Please set your Gemini API key in settings.');
      }

      // Add API key to params
      const serviceParams = {
        ...params,
        apiKey,
      };

      const result = await serviceManager.generateImage(serviceId, serviceParams);
      return result;
    } catch (error) {
      console.error('Service generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  ipcMain.handle('api-key:test', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        return { success: false, error: 'No API key found' };
      }

      // Test the API key with a simple request
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Test request' }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            maxOutputTokens: 100,
          },
        }),
      });

      if (response.status === 401) {
        return { success: false, error: 'Invalid API key' };
      } else if (response.status === 403) {
        return { success: false, error: 'API key does not have access to this service' };
      } else if (response.ok || response.status === 400) {
        // 400 is expected since we're not providing valid input for image generation
        return { success: true };
      } else {
        return { success: false, error: `API returned status ${response.status}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  });

  // Library management handlers
  ipcMain.handle('library:get', async (): Promise<LibraryItem[]> => {
    return getLibrary();
  });

  ipcMain.handle('library:add', async (_, imageData: string, prompt: string, originalFilename: string): Promise<LibraryItem> => {
    try {
      // Create unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const extension = path.extname(originalFilename) || '.png';
      const filename = `generated_${timestamp}_${randomSuffix}${extension}`;

      // Get library directory
      const libraryDir = getLibraryDirectoryPath();
      await fs.mkdir(libraryDir, { recursive: true });

      // Save image file
      const imagePath = path.join(libraryDir, filename);
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(imagePath, buffer);

      // Get file stats
      const stats = await fs.stat(imagePath);
      const fileSize = stats.size;

      // Create library item
      const libraryItem = await addToLibrary({
        prompt,
        imagePath,
        originalFilename,
        fileSize,
        imageFormat: extension.substring(1), // Remove the dot
      });

      return libraryItem;
    } catch (error) {
      throw new Error(`Failed to add image to library: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('library:remove', async (_, id: string): Promise<boolean> => {
    try {
      return await removeFromLibrary(id);
    } catch (error) {
      console.error('Failed to remove from library:', error);
      return false;
    }
  });

  ipcMain.handle('library:download', async (_, id: string, suggestedFilename?: string): Promise<string> => {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    const library = getLibrary();
    const item = library.find(i => i.id === id);
    if (!item) {
      throw new Error('Library item not found');
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Download Image from Library',
      defaultPath: suggestedFilename || item.originalFilename,
      filters: [
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
        { name: 'WebP Images', extensions: ['webp'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      throw new Error('Download dialog was cancelled');
    }

    // Copy the file to the selected location
    await fs.copyFile(item.imagePath, result.filePath);
    return result.filePath;
  });

  ipcMain.handle('library:get-image-data', async (_, id: string): Promise<string> => {
    try {
      const library = getLibrary();
      const item = library.find(i => i.id === id);
      if (!item) {
        throw new Error('Library item not found');
      }

      const buffer = await fs.readFile(item.imagePath);
      const base64Data = buffer.toString('base64');
      const mimeType = `image/${item.imageFormat}`;
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      throw new Error(`Failed to get image data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
};