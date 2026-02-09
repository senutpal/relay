import type { Match, Commentary, ApiResponse } from '../types/api';

const API_BASE_URL = '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }


  async getMatches(limit?: number): Promise<ApiResponse<Match[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<ApiResponse<Match[]>>(`/matches${query}`);
  }

  async getMatch(id: string): Promise<ApiResponse<Match>> {
    return this.request<ApiResponse<Match>>(`/matches/${id}`);
  }


  async getCommentary(matchId: string, limit?: number): Promise<ApiResponse<Commentary[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<ApiResponse<Commentary[]>>(`/matches/${matchId}/commentary${query}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;