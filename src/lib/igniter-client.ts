import { env } from '@/config/env';

export interface IgniterTokenInfo {
  token: string;
  expiresAt: string;
  expiresIn: number;
  shouldRefresh: boolean;
  timeToExpire: string;
}

export interface IgniterSessionInfo {
  userId: string;
  tenantId: string;
  role: string;
  tokenInfo: IgniterTokenInfo;
  sessionStart: string;
  lastActivity: string;
  warnings: {
    tokenExpiring: boolean;
    timeRemaining: string;
  };
}

export interface DashboardMetrics {
  userMetrics: {
    userId: string;
    tenantId: string;
    lastLogin: string;
  };
  tenantMetrics: {
    totalTickets: number;
    activeAgents: number;
    avgWaitTime: string;
    queueLength: number;
  };
}

export interface ChartData {
  tenantId: string;
  chartData: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }>;
  };
  metadata: {
    generatedAt: string;
    requestedBy: string;
    period: string;
    type: string;
  };
}

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

class IgniterClient {
  private baseURL: string;
  private token: string | null = null;
  
  // 🚀 Sistema de deduplicação de requests
  private requestQueue = new Map<string, Promise<unknown>>();
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_CACHE_TTL = 30 * 1000; // 30 segundos
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  
  // 📊 Métricas do cliente
  private metrics = {
    requestCount: 0,
    cacheHits: 0,
    deduplicatedRequests: 0,
    errors: 0,
  };

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    
    // Limpeza automática de cache a cada 2 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredCache();
    }, 2 * 60 * 1000);
  }

  // Método para limpar recursos (útil para testes ou cleanup manual)
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.requestQueue.clear();
  }

  setToken(token: string) {
    this.token = token;
  }

  // 🧹 Limpeza de cache expirado
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Usar Array.from para compatibilidade
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Client cache cleanup: ${cleanedCount} expired entries removed`);
    }
  }

  // 📊 Obter métricas do cliente
  getClientMetrics() {
    const total = this.metrics.requestCount;
    const cacheHitRate = total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;
    
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      queueSize: this.requestQueue.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  }

  // 🗑️ Limpar cache do cliente
  clearClientCache(): number {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Client cache cleared: ${size} entries removed`);
    return size;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheable: boolean = false,
    cacheTTL: number = this.DEFAULT_CACHE_TTL
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const requestKey = `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || {})}`;
    
    this.metrics.requestCount++;
    
    // 🎯 Verificar cache primeiro (apenas para GET requests)
    if (cacheable && (!options.method || options.method === 'GET')) {
      const cached = this.cache.get(requestKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.metrics.cacheHits++;
        console.log(`🎯 Client cache HIT for: ${endpoint}`);
        return cached.data as T;
      }
    }
    
    // 🔄 Verificar se já existe request em andamento (deduplicação)
    if (this.requestQueue.has(requestKey)) {
      this.metrics.deduplicatedRequests++;
      console.log(`🔄 Request deduplication for: ${endpoint}`);
      return this.requestQueue.get(requestKey)! as Promise<T>;
    }
    
    // 🚀 Criar nova request
    const requestPromise = this.performRequest<T>(url, options, requestKey, cacheable, cacheTTL);
    this.requestQueue.set(requestKey, requestPromise);
    
    // Limpar da queue quando completar
    requestPromise.finally(() => {
      this.requestQueue.delete(requestKey);
    });
    
    return requestPromise;
  }

  private async performRequest<T>(
    url: string,
    options: RequestInit,
    requestKey: string,
    cacheable: boolean,
    cacheTTL: number
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      console.log(`🌐 Making request to: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        this.metrics.errors++;
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 💾 Armazenar no cache se cacheável
      if (cacheable && (!options.method || options.method === 'GET')) {
        this.cache.set(requestKey, {
          data,
          timestamp: Date.now(),
          ttl: cacheTTL,
        });
        console.log(`💾 Cached response for: ${url}`);
      }
      
      return data;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Igniter Client Error:', error);
      throw error;
    }
  }

  // ==================== DASHBOARD ENDPOINTS OTIMIZADOS ====================

  async getPublicMetrics() {
    return this.request('/dashboard/public-metrics', {}, true, 60 * 1000); // Cache por 1 minuto
  }

  async getPrivateMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/dashboard/private-metrics', {}, true, 30 * 1000); // Cache por 30s
  }

  async getAdminMetrics() {
    return this.request('/dashboard/admin-metrics', {}, true, 45 * 1000); // Cache por 45s
  }

  async getTenantMetrics() {
    return this.request('/dashboard/tenant-metrics', {}, true, 30 * 1000); // Cache por 30s
  }

  async updateMetrics(data: {
    metricType: 'users' | 'tickets' | 'revenue' | 'performance';
    value: number;
    description?: string;
  }) {
    return this.request('/dashboard/update-metrics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChartData(params: {
    type?: string;
    period?: string;
    tenantId?: string;
  } = {}): Promise<ChartData> {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][]
    ).toString();
    
    return this.request<ChartData>(
      `/dashboard/chart-data${queryString ? `?${queryString}` : ''}`,
      {},
      true,
      2 * 60 * 1000 // Cache por 2 minutos (dados de gráfico mudam menos)
    );
  }

  async getConnectionStatus() {
    return this.request('/dashboard/connection-status', {}, true, 10 * 1000); // Cache por 10s
  }

  async getSessionInfo(): Promise<IgniterSessionInfo> {
    return this.request<IgniterSessionInfo>('/dashboard/session-info');
  }

  async refreshToken(): Promise<{ access_token: string; expires_in: number; message: string; refreshed_at: string }> {
    return this.request('/dashboard/refresh-token', {
      method: 'POST',
    });
  }

  async getTokenStatus(): Promise<{
    status: 'valid' | 'expiring_soon';
    token: string;
    expiresAt: string;
    expiresIn: number;
    shouldRefresh: boolean;
    timeToExpire: string;
    recommendations: {
      should_refresh: boolean;
      action: string;
    };
  }> {
    return this.request('/dashboard/token-status');
  }
}

// Instância singleton - agora aponta para o backend NestJS
export const igniterClient = new IgniterClient(env.API_URL);
