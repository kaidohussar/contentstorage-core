/**
 * API Client for Contentstorage CLI API
 * Uses API key authentication for project-level access
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { CONTENTSTORAGE_CONFIG } from '../utils/constants.js';

export interface ContentResponse {
  success: boolean;
  data: Record<string, Record<string, any>>;
  metadata: {
    projectId: string;
    languages: string[];
    hasPendingChanges: boolean;
    format: string;
    source: 'draft' | 'published';
  };
}

export interface PushResult {
  keysAdded: number;
  keysUpdated: number;
  keysSkipped: number;
  pendingChangesCreated: boolean;
  uploadId?: string;
}

export interface PushResponse {
  success: boolean;
  result: PushResult;
  dryRun?: boolean;
}

export interface ProjectResponse {
  success: boolean;
  project: {
    id: string;
    name: string;
    languages: string[];
    changeTrackingEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface StatsResponse {
  success: boolean;
  stats: {
    totalKeys: number;
    languages: Array<{
      code: string;
      completed: number;
      percentage: number;
    }>;
    pendingChanges: {
      total: number;
      added: number;
      edited: number;
      removed: number;
    };
  };
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
}

export class ApiClient {
  private client: AxiosInstance;
  private projectId: string;

  constructor(apiKey: string, projectId: string) {
    this.projectId = projectId;
    this.client = axios.create({
      baseURL: `${CONTENTSTORAGE_CONFIG.API_URL}/api/v1/cli`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: AxiosError<ApiError>): never {
    if (error.response?.data) {
      const { error: errorCode, message } = error.response.data;
      throw new Error(`${errorCode}: ${message}`);
    }
    if (error.response) {
      throw new Error(`API error: ${error.response.status} ${error.response.statusText}`);
    }
    throw new Error(`Network error: ${error.message}`);
  }

  /**
   * Pull content from the API
   * @param options.languageCode - Optional specific language (returns all if omitted)
   * @param options.format - 'nested' or 'flat' (default: nested)
   * @param options.draft - true for draft content, false for published (default: true)
   */
  async getContent(options: {
    languageCode?: string;
    format?: 'nested' | 'flat';
    draft?: boolean;
  } = {}): Promise<ContentResponse> {
    try {
      const params = new URLSearchParams();
      params.append('projectId', this.projectId);

      if (options.languageCode) {
        params.append('languageCode', options.languageCode);
      }
      if (options.format) {
        params.append('format', options.format);
      }
      if (options.draft !== undefined) {
        params.append('draft', String(options.draft));
      }

      const response = await this.client.get<ContentResponse>(`/content?${params}`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
    }
  }

  /**
   * Push content to the API
   * @param languageCode - The language code to push
   * @param content - The content object (nested or flat)
   * @param options.dryRun - If true, validate only without saving
   */
  async pushContent(
    languageCode: string,
    content: Record<string, any>,
    options: { dryRun?: boolean } = {}
  ): Promise<PushResponse> {
    try {
      const response = await this.client.post<PushResponse>('/content/push', {
        projectId: this.projectId,
        languageCode,
        content,
        options: {
          dryRun: options.dryRun || false,
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
    }
  }

  /**
   * Get project information
   */
  async getProject(): Promise<ProjectResponse> {
    try {
      const response = await this.client.get<ProjectResponse>(`/projects/${this.projectId}`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
    }
  }

  /**
   * Get translation statistics
   */
  async getStats(): Promise<StatsResponse> {
    try {
      const response = await this.client.get<StatsResponse>(`/projects/${this.projectId}/stats`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError<ApiError>);
    }
  }
}

/**
 * Create an API client from config
 * Returns null if API key is not configured
 */
export function createApiClient(config: {
  apiKey?: string;
  projectId?: string;
}): ApiClient | null {
  if (!config.apiKey || !config.projectId) {
    return null;
  }
  return new ApiClient(config.apiKey, config.projectId);
}
