import {
  Queue,
  Ticket,
  CreateQueueDto,
  CreateTicketDto,
  QueueStats,
  AbandonmentStats,
  CleanupResponse,
  LoginDto,
  AuthResponse,
  IgniterDashboardMetrics,
  IgniterChartData,
  IgniterSessionInfo,
  IgniterTokenStatus,
  IgniterRefreshTokenResponse,
  PublicTicketStatus,
} from '@/types';
import { env } from '@/config/env';
import { igniterClient } from '@/lib/igniter-client';

const API_BASE_URL = env.API_URL;

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('🌐 API Request:', {
      method: options.method || 'GET',
      url,
      headers: options.headers,
      body: options.body ? 'Presente' : 'Ausente'
    })
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('🌐 API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData)
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API Success Response:', data)
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      throw error;
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  async login(credentials: LoginDto): Promise<AuthResponse> {
    console.log('🌐 API: Iniciando login para email:', credentials.email)
    console.log('🌐 API: URL base:', this.baseURL)
    console.log('🌐 API: Endpoint completo:', `${this.baseURL}/auth/login`)
    
    try {
      const response = await this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      console.log('✅ API: Login bem-sucedido:', {
        accessToken: response.access_token ? 'Presente' : 'Ausente',
        userId: response.user?.id,
        userName: response.user?.name
      })
      
      this.setToken(response.access_token);
      return response;
    } catch (error) {
      console.error('❌ API: Erro no login:', error)
      throw error
    }
  }

  async logout(): Promise<void> {
    this.clearToken();
  }

  async getQueues(tenantId: string): Promise<Queue[]> {
    return this.request<Queue[]>(`/tenants/${tenantId}/queues`);
  }

  async getQueue(tenantId: string, queueId: string): Promise<Queue> {
    return this.request<Queue>(`/tenants/${tenantId}/queues/${queueId}`);
  }

  async createQueue(tenantId: string, queue: CreateQueueDto): Promise<Queue> {
    console.log('🏗️ ApiClient.createQueue chamado com:', { tenantId, queue })
    console.log('🌐 URL base configurada:', this.baseURL)
    console.log('🔐 Token configurado:', this.token ? 'Sim' : 'Não')
    
    return this.request<Queue>(`/tenants/${tenantId}/queues`, {
      method: 'POST',
      body: JSON.stringify(queue),
    });
  }

  async updateQueue(
    tenantId: string,
    queueId: string,
    queue: Partial<CreateQueueDto>
  ): Promise<Queue> {
    return this.request<Queue>(`/tenants/${tenantId}/queues/${queueId}`, {
      method: 'PUT',
      body: JSON.stringify(queue),
    });
  }

  async deleteQueue(tenantId: string, queueId: string): Promise<void> {
    return this.request<void>(`/tenants/${tenantId}/queues/${queueId}`, {
      method: 'DELETE',
    });
  }

  async callNext(tenantId: string, queueId: string): Promise<Ticket> {
    return this.request<Ticket>(`/tenants/${tenantId}/queues/${queueId}/call-next`, {
      method: 'POST',
    });
  }

  async createTicket(queueId: string, ticket: CreateTicketDto): Promise<Ticket> {
    return this.request<Ticket>(`/queues/${queueId}/tickets`, {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  async getAgents(tenantId: string): Promise<Agent[]> {
    return this.request<Agent[]>(`/tenants/${tenantId}/agents`);
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${ticketId}`);
  }

  async recallTicket(ticketId: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${ticketId}/recall`, {
      method: 'PUT',
    });
  }

  async skipTicket(ticketId: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${ticketId}/skip`, {
      method: 'PUT',
    });
  }

  async completeTicket(ticketId: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${ticketId}/complete`, {
      method: 'PUT',
    });
  }

  async getPublicTicketStatus(guestToken: string): Promise<PublicTicketStatus> {
    return this.request<PublicTicketStatus>(`/tickets/public/${guestToken}`);
  }

  async getQueueStats(tenantId: string, queueId: string): Promise<QueueStats> {
    return this.request<QueueStats>(`/tenants/${tenantId}/queues/${queueId}/stats`);
  }

  async getAbandonmentStats(tenantId: string, queueId: string): Promise<AbandonmentStats> {
    return this.request<AbandonmentStats>(`/tenants/${tenantId}/queues/${queueId}/abandonment-stats`);
  }

  async cleanupQueue(tenantId: string, queueId: string): Promise<CleanupResponse> {
    return this.request<CleanupResponse>(`/tenants/${tenantId}/queues/${queueId}/cleanup`, {
      method: 'POST',
    });
  }

  // ==================== IGNITER METHODS ====================

  // Configurar token no cliente Igniter
  setIgniterToken(token: string) {
    igniterClient.setToken(token);
  }

  // Dashboard Igniter methods
  async getIgniterPublicMetrics() {
    return igniterClient.getPublicMetrics();
  }

  async getIgniterPrivateMetrics(): Promise<IgniterDashboardMetrics> {
    return igniterClient.getPrivateMetrics();
  }

  async getIgniterAdminMetrics() {
    return igniterClient.getAdminMetrics();
  }

  async getIgniterTenantMetrics() {
    return igniterClient.getTenantMetrics();
  }

  async updateIgniterMetrics(data: {
    metricType: 'users' | 'tickets' | 'revenue' | 'performance';
    value: number;
    description?: string;
  }) {
    return igniterClient.updateMetrics(data);
  }

  async getIgniterChartData(params: {
    type?: string;
    period?: string;
    tenantId?: string;
  } = {}): Promise<IgniterChartData> {
    return igniterClient.getChartData(params);
  }

  async getIgniterConnectionStatus() {
    return igniterClient.getConnectionStatus();
  }

  // Session management methods
  async getIgniterSessionInfo(): Promise<IgniterSessionInfo> {
    return igniterClient.getSessionInfo();
  }

  async refreshIgniterToken(): Promise<IgniterRefreshTokenResponse> {
    return igniterClient.refreshToken();
  }

  async getIgniterTokenStatus(): Promise<IgniterTokenStatus> {
    return igniterClient.getTokenStatus();
  }
}

export const apiClient = new ApiClient(API_BASE_URL); 