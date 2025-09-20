/**
 * Library utilities for image file management
 */

export interface LibraryImageData {
  data: string; // base64 data URL
  filename: string;
  size: number;
  format: string;
}

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Format timestamp to human readable date
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Get relative time from timestamp (e.g., "2 hours ago")
 */
export const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return formatDate(timestamp);
  }
};

/**
 * Extract filename from path
 */
export const getFilenameFromPath = (filePath: string): string => {
  return filePath.split(/[\\/]/).pop() || 'unknown';
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

/**
 * Generate a safe filename for download
 */
export const generateSafeFilename = (prompt: string, timestamp: number, format: string): string => {
  // Clean the prompt for use in filename
  const cleanPrompt = prompt
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length

  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  return `${cleanPrompt}_${dateStr}.${format}`;
};

/**
 * Check if image format is supported
 */
export const isSupportedImageFormat = (format: string): boolean => {
  const supportedFormats = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];
  return supportedFormats.includes(format.toLowerCase());
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (extension: string): string => {
  const mimeTypes: { [key: string]: string } = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
  };

  return mimeTypes[extension.toLowerCase()] || 'image/png';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Search library items by prompt text
 */
export const searchLibraryItems = <T extends { prompt: string }>(
  items: T[],
  searchTerm: string
): T[] => {
  if (!searchTerm.trim()) return items;

  const term = searchTerm.toLowerCase();
  return items.filter(item =>
    item.prompt.toLowerCase().includes(term)
  );
};

/**
 * Sort library items by various criteria
 */
export const sortLibraryItems = <T extends { timestamp: number; fileSize: number }>(
  items: T[],
  sortBy: 'newest' | 'oldest' | 'largest' | 'smallest'
): T[] => {
  const sorted = [...items];

  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => b.timestamp - a.timestamp);
    case 'oldest':
      return sorted.sort((a, b) => a.timestamp - b.timestamp);
    case 'largest':
      return sorted.sort((a, b) => b.fileSize - a.fileSize);
    case 'smallest':
      return sorted.sort((a, b) => a.fileSize - b.fileSize);
    default:
      return sorted;
  }
};