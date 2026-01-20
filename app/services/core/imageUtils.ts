import * as fs from 'fs/promises';
import sharp from 'sharp';

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'png' | 'jpg' | 'webp';
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const validateImage = async (filePath: string): Promise<ImageValidationResult> => {
  try {
    const stats = await fs.stat(filePath);

    if (stats.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum allowed size (10MB)`,
      };
    }

    // Use Sharp to get actual image metadata and validate format
    const image = sharp(filePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'Unable to read image dimensions',
      };
    }

    // Validate dimensions (64-4096px range as per Gemini requirements)
    if (metadata.width < 64 || metadata.height < 64) {
      return {
        isValid: false,
        error: 'Image dimensions too small (minimum 64x64 pixels)',
      };
    }

    if (metadata.width > 4096 || metadata.height > 4096) {
      return {
        isValid: false,
        error: 'Image dimensions too large (maximum 4096x4096 pixels)',
      };
    }

    // Validate supported formats
    const supportedFormats = ['jpeg', 'png', 'webp', 'tiff'];
    if (!metadata.format || !supportedFormats.includes(metadata.format)) {
      return {
        isValid: false,
        error: `Unsupported image format. Supported formats: ${supportedFormats.join(', ')}`,
      };
    }

    return {
      isValid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
    };

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
};

export const resizeAndEncodeImage = async (
  filePath: string,
  options: ResizeOptions = {}
): Promise<string> => {
  try {
    const { maxWidth = 1024, maxHeight = 1024 } = options;

    // Load image with Sharp
    let image = sharp(filePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }

    // Calculate if resizing is needed (≤1024px long edge)
    const maxDimension = Math.max(metadata.width, metadata.height);
    if (maxDimension > Math.max(maxWidth, maxHeight)) {
      const scaleFactor = Math.max(maxWidth, maxHeight) / maxDimension;
      const newWidth = Math.round(metadata.width * scaleFactor);
      const newHeight = Math.round(metadata.height * scaleFactor);

      image = image.resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true,
      });
    }

    // Convert to PNG for consistency and get buffer
    const pngBuffer = await image.png().toBuffer();
    const base64 = pngBuffer.toString('base64');

    return `data:image/png;base64,${base64}`;

  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getImageDimensions = async (filePath: string): Promise<{ width: number; height: number }> => {
  try {
    const metadata = await sharp(filePath).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    throw new Error(`Failed to get image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const optimizeImageForUpload = async (
  filePath: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 85
): Promise<string> => {
  // Validate file size and format only (not dimensions, since we'll resize)
  try {
    const stats = await fs.stat(filePath);

    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum allowed size (10MB)`);
    }

    const image = sharp(filePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }

    // Validate minimum dimensions
    if (metadata.width < 64 || metadata.height < 64) {
      throw new Error('Image dimensions too small (minimum 64x64 pixels)');
    }

    // Validate supported formats
    const supportedFormats = ['jpeg', 'png', 'webp', 'tiff'];
    if (!metadata.format || !supportedFormats.includes(metadata.format)) {
      throw new Error(`Unsupported image format. Supported formats: ${supportedFormats.join(', ')}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown validation error');
  }

  // Resize and encode (handles large images by downscaling to maxWidth/maxHeight)
  return await resizeAndEncodeImage(filePath, {
    maxWidth,
    maxHeight,
    quality,
  });
};