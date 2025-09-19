import * as keytar from 'keytar';

const SERVICE_NAME = 'DIBE-ImageGen';
const API_KEY_ACCOUNT = 'gemini-api-key';

export const storeApiKey = async (apiKey: string): Promise<void> => {
  try {
    await keytar.setPassword(SERVICE_NAME, API_KEY_ACCOUNT, apiKey);
  } catch (error) {
    console.error('Failed to store API key:', error);
    throw new Error('Failed to securely store API key');
  }
};

export const getApiKey = async (): Promise<string | null> => {
  try {
    return await keytar.getPassword(SERVICE_NAME, API_KEY_ACCOUNT);
  } catch (error) {
    console.error('Failed to retrieve API key:', error);
    return null;
  }
};

export const deleteApiKey = async (): Promise<void> => {
  try {
    await keytar.deletePassword(SERVICE_NAME, API_KEY_ACCOUNT);
  } catch (error) {
    console.error('Failed to delete API key:', error);
    throw new Error('Failed to delete stored API key');
  }
};

export const hasStoredApiKey = async (): Promise<boolean> => {
  const apiKey = await getApiKey();
  return apiKey !== null && apiKey.length > 0;
};