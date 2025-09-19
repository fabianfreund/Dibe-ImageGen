export interface ServiceJob {
  id: string;
  serviceId: string;
  params: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceWorkerMessage {
  type: 'job' | 'status' | 'result' | 'error';
  jobId: string;
  data?: any;
  error?: string;
}

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  workerPath: string;
  maxConcurrency: number;
}

export abstract class ServiceContract {
  protected config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  abstract validateParams(params: any): Promise<boolean>;
  abstract execute(params: any): Promise<any>;

  getConfig(): ServiceConfig {
    return this.config;
  }
}