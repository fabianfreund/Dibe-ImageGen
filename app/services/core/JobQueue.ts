import { ServiceJob, ServiceWorkerMessage } from './ServiceContract';
import { Worker } from 'worker_threads';

export class JobQueue {
  private jobs: Map<string, ServiceJob> = new Map();
  private workers: Map<string, Worker> = new Map();
  private maxConcurrency: number;
  private serviceWorkerPath: string;

  constructor(serviceWorkerPath: string, maxConcurrency: number = 2) {
    this.serviceWorkerPath = serviceWorkerPath;
    this.maxConcurrency = maxConcurrency;
  }

  public async addJob(serviceId: string, params: any): Promise<string> {
    const jobId = this.generateJobId();
    const job: ServiceJob = {
      id: jobId,
      serviceId,
      params,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.processQueue();

    return jobId;
  }

  public getJob(jobId: string): ServiceJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): ServiceJob[] {
    return Array.from(this.jobs.values());
  }

  public getJobsByStatus(status: ServiceJob['status']): ServiceJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  private async processQueue(): Promise<void> {
    const runningJobs = this.getJobsByStatus('running');
    const pendingJobs = this.getJobsByStatus('pending');

    if (runningJobs.length >= this.maxConcurrency || pendingJobs.length === 0) {
      return;
    }

    const jobsToStart = pendingJobs.slice(0, this.maxConcurrency - runningJobs.length);

    for (const job of jobsToStart) {
      await this.startJob(job);
    }
  }

  private async startJob(job: ServiceJob): Promise<void> {
    try {
      job.status = 'running';
      job.updatedAt = new Date();

      const worker = new Worker(this.serviceWorkerPath, {
        workerData: {
          jobId: job.id,
          params: job.params,
        },
      });

      this.workers.set(job.id, worker);

      worker.on('message', (message: ServiceWorkerMessage) => {
        this.handleWorkerMessage(job.id, message);
      });

      worker.on('error', (error) => {
        this.handleJobError(job.id, error.message);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.handleJobError(job.id, `Worker stopped with exit code ${code}`);
        }
        this.workers.delete(job.id);
        this.processQueue();
      });

    } catch (error) {
      this.handleJobError(job.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private handleWorkerMessage(jobId: string, message: ServiceWorkerMessage): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    switch (message.type) {
      case 'result':
        job.status = 'completed';
        job.result = message.data;
        job.updatedAt = new Date();
        this.terminateWorker(jobId);
        break;

      case 'error':
        this.handleJobError(jobId, message.error || 'Unknown worker error');
        break;

      case 'status':
        // Handle status updates if needed
        break;
    }
  }

  private handleJobError(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error;
    job.updatedAt = new Date();

    this.terminateWorker(jobId);
  }

  private terminateWorker(jobId: string): void {
    const worker = this.workers.get(jobId);
    if (worker) {
      worker.terminate();
      this.workers.delete(jobId);
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public cleanup(): void {
    for (const [, worker] of this.workers) {
      worker.terminate();
    }
    this.workers.clear();
    this.jobs.clear();
  }
}