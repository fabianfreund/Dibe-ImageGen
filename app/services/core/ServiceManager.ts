import { Worker } from 'worker_threads';
import * as path from 'path';
import { ServiceJob, ServiceWorkerMessage, ServiceConfig } from './ServiceContract';

export interface ServiceGenerateParams {
  images: string[]; // file paths
  prompt: string;
  apiKey: string;
}

export interface ServiceGenerateResult {
  success: boolean;
  images?: string[]; // base64 data URLs
  error?: string;
  metadata?: {
    model: string;
    timestamp: Date;
    prompt: string;
  };
}

export class ServiceManager {
  private static instance: ServiceManager;
  private runningJobs = new Map<string, ServiceJob>();
  private workers = new Map<string, Worker>();
  private jobCallbacks = new Map<string, {
    resolve: (result: ServiceGenerateResult) => void;
    reject: (error: Error) => void;
  }>();

  private readonly services: Record<string, ServiceConfig> = {
    'basic-image-gen': {
      id: 'basic-image-gen',
      name: 'Basic Image Generation',
      description: 'Generate images using Gemini 2.5 Flash Image Preview',
      version: '1.0.0',
      workerPath: path.join(__dirname, '../basic-image-gen/worker.js'),
      maxConcurrency: 2,
    },
    'youtube-thumbnail-gen': {
      id: 'youtube-thumbnail-gen',
      name: 'YouTube Thumbnail Generator',
      description: 'Generate YouTube thumbnails from templates using Gemini',
      version: '1.0.0',
      workerPath: path.join(__dirname, '../youtube-thumbnail-gen/worker.js'),
      maxConcurrency: 2,
    },
  };

  private constructor() {}

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  public async generateImage(serviceId: string, params: ServiceGenerateParams): Promise<ServiceGenerateResult> {
    const service = this.services[serviceId];
    if (!service) {
      throw new Error(`Unknown service: ${serviceId}`);
    }

    const jobId = this.generateJobId();
    const job: ServiceJob = {
      id: jobId,
      serviceId,
      params,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.runningJobs.set(jobId, job);

    return new Promise((resolve, reject) => {
      this.jobCallbacks.set(jobId, { resolve, reject });

      try {
        this.startWorker(job, service);
      } catch (error) {
        this.jobCallbacks.delete(jobId);
        this.runningJobs.delete(jobId);
        reject(error instanceof Error ? error : new Error('Failed to start worker'));
      }
    });
  }

  private startWorker(job: ServiceJob, service: ServiceConfig): void {
    const worker = new Worker(service.workerPath, {
      workerData: {
        jobId: job.id,
        params: job.params,
      },
    });

    this.workers.set(job.id, worker);

    worker.on('message', (message: ServiceWorkerMessage) => {
      this.handleWorkerMessage(job.id, message);
    });

    worker.on('error', (error: Error) => {
      this.handleWorkerError(job.id, error);
    });

    worker.on('exit', (code: number) => {
      if (code !== 0) {
        this.handleWorkerError(job.id, new Error(`Worker stopped with exit code ${code}`));
      }
    });

    // Update job status
    job.status = 'running';
    job.updatedAt = new Date();
    this.runningJobs.set(job.id, job);
  }

  private handleWorkerMessage(jobId: string, message: ServiceWorkerMessage): void {
    const job = this.runningJobs.get(jobId);
    const callbacks = this.jobCallbacks.get(jobId);

    if (!job || !callbacks) {
      console.error(`Received message for unknown job: ${jobId}`);
      return;
    }

    switch (message.type) {
      case 'status':
        // Update job status
        job.updatedAt = new Date();
        this.runningJobs.set(jobId, job);
        break;

      case 'result':
        // Job completed successfully
        job.status = 'completed';
        job.result = message.data;
        job.updatedAt = new Date();
        this.runningJobs.set(jobId, job);

        callbacks.resolve(message.data as ServiceGenerateResult);
        this.cleanup(jobId);
        break;

      case 'error':
        // Job failed
        job.status = 'failed';
        job.error = message.error;
        job.updatedAt = new Date();
        this.runningJobs.set(jobId, job);

        callbacks.reject(new Error(message.error || 'Worker error'));
        this.cleanup(jobId);
        break;
    }
  }

  private handleWorkerError(jobId: string, error: Error): void {
    const job = this.runningJobs.get(jobId);
    const callbacks = this.jobCallbacks.get(jobId);

    if (job) {
      job.status = 'failed';
      job.error = error.message;
      job.updatedAt = new Date();
      this.runningJobs.set(jobId, job);
    }

    if (callbacks) {
      callbacks.reject(error);
    }

    this.cleanup(jobId);
  }

  private cleanup(jobId: string): void {
    const worker = this.workers.get(jobId);
    if (worker && !worker.threadId) {
      worker.terminate();
    }

    this.workers.delete(jobId);
    this.jobCallbacks.delete(jobId);

    // Keep completed jobs for a while for debugging
    setTimeout(() => {
      this.runningJobs.delete(jobId);
    }, 60000); // 1 minute
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getJobStatus(jobId: string): ServiceJob | undefined {
    return this.runningJobs.get(jobId);
  }

  public getAllJobs(): ServiceJob[] {
    return Array.from(this.runningJobs.values());
  }

  public getAvailableServices(): ServiceConfig[] {
    return Object.values(this.services);
  }
}