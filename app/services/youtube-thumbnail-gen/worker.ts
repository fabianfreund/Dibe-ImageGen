import { parentPort, workerData } from 'worker_threads';
import { ServiceWorkerMessage } from '../core/ServiceContract';
import { generateYouTubeThumbnail } from './gemini';
import { optimizeImageForUpload } from '../core/imageUtils';

interface WorkerData {
  jobId: string;
  params: {
    templateImage: string;      // file path to template
    referenceImages: string[];  // file paths (optional, can be empty)
    prompt: string;            // user text prompt
    apiKey: string;            // from keytar
  };
}

interface Part {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

const sendMessage = (message: ServiceWorkerMessage): void => {
  if (parentPort) {
    parentPort.postMessage(message);
  }
};

const processJob = async (data: WorkerData): Promise<void> => {
  try {
    const { jobId, params } = data;

    // Validate parameters
    if (!params.templateImage || params.templateImage.trim().length === 0) {
      throw new Error('No template image provided');
    }

    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('No prompt provided');
    }

    if (!params.apiKey || params.apiKey.trim().length === 0) {
      throw new Error('No API key provided');
    }

    // Send status update
    sendMessage({
      type: 'status',
      jobId,
      data: { status: 'processing', message: 'Processing template image...' },
    });

    // Process template image first (primary/most important)
    // Use higher resolution for template to maintain quality (1920 max dimension for 1280x720 target)
    let templateBase64: string;
    try {
      templateBase64 = await optimizeImageForUpload(params.templateImage, 1920, 1920);
      // Remove data URL prefix to get just the base64 data
      templateBase64 = templateBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    } catch (error) {
      throw new Error(`Failed to process template image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Assemble multimodal parts array with template image FIRST to establish format
    const parts: Part[] = [
      {
        text: 'THIS IS THE TEMPLATE - Match this image\'s EXACT resolution, dimensions, and layout structure:',
      },
      {
        inline_data: {
          mime_type: 'image/png',
          data: templateBase64,
        },
      },
      {
        text: 'You must create a YouTube thumbnail that has the EXACT SAME resolution and aspect ratio as the template image above. Preserve the template\'s dimensions (1280x720 or 16:9 ratio) and layout structure.',
      },
    ];

    // Process reference images if provided (optional)
    if (params.referenceImages && params.referenceImages.length > 0) {
      sendMessage({
        type: 'status',
        jobId,
        data: { status: 'processing', message: 'Processing reference images...' },
      });

      parts.push({
        text: 'The following are REFERENCE images - use them ONLY for content inspiration and styling ideas. DO NOT use their resolution or aspect ratio. Keep the template\'s resolution and layout:',
      });

      for (let i = 0; i < params.referenceImages.length; i++) {
        const imagePath = params.referenceImages[i];

        sendMessage({
          type: 'status',
          jobId,
          data: { status: 'processing', message: `Processing reference image ${i + 1}/${params.referenceImages.length}...` },
        });

        try {
          // Use higher resolution for reference images too (1920 max for quality)
          let base64Image = await optimizeImageForUpload(imagePath, 1920, 1920);
          // Remove data URL prefix
          base64Image = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

          parts.push({
            text: `Reference ${i + 1}:`,
          });

          parts.push({
            inline_data: {
              mime_type: 'image/png',
              data: base64Image,
            },
          });
        } catch (error) {
          throw new Error(`Failed to process reference image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Add user prompt at the end for customization
    parts.push({
      text: `Additional customization requirements: ${params.prompt}\n\nFINAL REMINDER: Output must match the TEMPLATE image's resolution and aspect ratio (the first image shown). The reference images are only for content ideas, NOT for resolution. Generate in the template's format: 1280x720 or 16:9 ratio.`,
    });

    sendMessage({
      type: 'status',
      jobId,
      data: { status: 'processing', message: 'Generating YouTube thumbnail with AI...' },
    });

    // Generate thumbnail with Gemini
    const result = await generateYouTubeThumbnail(parts, params.apiKey);

    // Send result
    sendMessage({
      type: 'result',
      jobId,
      data: result,
    });

  } catch (error) {
    sendMessage({
      type: 'error',
      jobId: data.jobId,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

// Start processing when worker is created
if (workerData) {
  processJob(workerData as WorkerData);
} else {
  sendMessage({
    type: 'error',
    jobId: 'unknown',
    error: 'No worker data provided',
  });
}
