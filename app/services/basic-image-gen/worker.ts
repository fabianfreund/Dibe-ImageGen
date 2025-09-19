import { parentPort, workerData } from 'worker_threads';
import { ServiceWorkerMessage } from '../core/ServiceContract';
import { generateWithGemini } from './gemini';
import { optimizeImageForUpload } from '../core/imageUtils';

interface WorkerData {
  jobId: string;
  params: {
    images: string[]; // file paths
    prompt: string;
    apiKey: string;
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
    if (!params.images || params.images.length === 0) {
      throw new Error('No images provided');
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
      data: { status: 'processing', message: 'Processing images...' },
    });

    // Process and encode images
    const processedImages: string[] = [];
    for (let i = 0; i < params.images.length; i++) {
      const imagePath = params.images[i];

      sendMessage({
        type: 'status',
        jobId,
        data: { status: 'processing', message: `Processing image ${i + 1}/${params.images.length}...` },
      });

      try {
        const base64Image = await optimizeImageForUpload(imagePath);
        processedImages.push(base64Image);
      } catch (error) {
        throw new Error(`Failed to process image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    sendMessage({
      type: 'status',
      jobId,
      data: { status: 'processing', message: 'Generating image with AI...' },
    });

    // Generate image with Gemini
    const result = await generateWithGemini(processedImages, params.prompt, params.apiKey);

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