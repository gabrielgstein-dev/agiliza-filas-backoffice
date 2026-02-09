import { createWithEqualityFn } from 'zustand/traditional';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  IgniterNotification, 
  QueueConnection
} from '@/types/igniter';
import { 
  generateNotificationId,
  calculateReconnectDelay,
  createSSEUrl,
  isHeartbeatEvent,
  parseSSEData,
  validateEventData,
  formatNotificationMessage,
  shouldReconnect,
  logSSEEvent,
  SSE_CONFIG
} from '@/lib/sse-utils';

interface IgniterStore {
  // Estados principais
  isConnected: boolean;
  connectionError: string | null;
  notifications: IgniterNotification[];
  queueConnections: Map<string, QueueConnection>;
  subscribers: Map<string, Set<(data: unknown) => void>>;
  sseEnabled: boolean;
  mainEventSource: EventSource | null;
  
  // Estados de controle
  isConnecting: boolean;
  
  // Ações de conexão principal
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setSseEnabled: (enabled: boolean) => void;
  connectToMainSSE: () => void;
  disconnectFromMainSSE: () => void;
  
  // Ações de notificações
  addNotification: (notification: Omit<IgniterNotification, 'id' | 'read'>) => void;
  clearNotifications: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllAsRead: () => void;
  
  // Ações de subscribers
  subscribe: (eventType: string, callback: (data: unknown) => void) => () => void;
  unsubscribe: (eventType: string, callback: (data: unknown) => void) => void;
  notifySubscribers: (eventType: string, data: unknown) => void;
  
  // Ações de filas
  connectToQueue: (queueId: string) => () => void;
  disconnectFromQueue: (queueId: string) => void;
  clearAllConnections: () => void;
  
  // Seletores otimizados
  getConnectionStatus: () => { isConnected: boolean; error: string | null; isConnecting: boolean };
  getNotificationsByType: (type: string) => IgniterNotification[];
  getUnreadCount: () => number;
  getQueueConnectionStatus: (queueId: string) => { isConnected: boolean; isReconnecting: boolean };
  getActiveConnectionsCount: () => number;
}

export const useIgniterStore = createWithEqualityFn<IgniterStore>()(
  subscribeWithSelector((set, get) => ({
    // Estados iniciais
    isConnected: false,
    connectionError: null,
    notifications: [],
    queueConnections: new Map(),
    subscribers: new Map(),
    sseEnabled: false,
    mainEventSource: null,
    isConnecting: false,

    // === AÇÕES DE CONEXÃO PRINCIPAL ===
    setConnected: (connected) => set({ isConnected: connected }),
    setConnectionError: (error) => set({ connectionError: error }),
    setSseEnabled: (enabled) => set({ sseEnabled: enabled }),

    connectToMainSSE: () => {
      const { isConnecting, mainEventSource } = get();
      
      if (isConnecting || (mainEventSource && mainEventSource.readyState === EventSource.OPEN)) {
        logSSEEvent('connect', 'principal já ativa ou em andamento');
        return;
      }

      set({ isConnecting: true, connectionError: null });

      try {
        const eventSourceUrl = createSSEUrl('ticket-changes');
        const eventSource = new EventSource(eventSourceUrl);

        eventSource.onopen = () => {
          logSSEEvent('connect', 'principal estabelecida');
          set({ isConnected: true, isConnecting: false, connectionError: null });
        };

        eventSource.onmessage = (event) => {
          const data = parseSSEData(event.data);
          if (!data || isHeartbeatEvent(data)) return;

          logSSEEvent('message', 'principal', data);

          const { addNotification, notifySubscribers } = get();
          
          if (validateEventData(data)) {
            addNotification({
              type: (data.eventType || data.type) as IgniterNotification['type'],
              message: formatNotificationMessage(data),
              timestamp: data.timestamp || new Date().toISOString(),
              data
            });

            notifySubscribers(data.eventType || data.type || '*', data);
            notifySubscribers('*', data);
          }

          if (data.requiresReauth) {
            console.warn('🔐 Reautenticação necessária detectada');
          }
        };

        eventSource.onerror = (error) => {
          logSSEEvent('error', 'conexão principal', error);
          set({ 
            isConnected: false, 
            isConnecting: false,
            connectionError: 'Erro na conexão SSE - backend não implementado'
          });
        };

        set({ mainEventSource: eventSource });

      } catch (error) {
        logSSEEvent('error', 'falha ao criar conexão principal', error);
        set({ 
          isConnecting: false, 
          connectionError: 'Erro ao estabelecer conexão'
        });
      }
    },

    disconnectFromMainSSE: () => {
      const { mainEventSource } = get();

      if (mainEventSource) {
        mainEventSource.close();
        logSSEEvent('disconnect', 'principal');
      }

      set({ 
        mainEventSource: null, 
        isConnected: false, 
        isConnecting: false
      });
    },

    // === AÇÕES DE NOTIFICAÇÕES ===
    addNotification: (notification) => set((state) => {
      const id = generateNotificationId(notification.type);
      const newNotification = { ...notification, id, read: false };
      
      return {
        notifications: [newNotification, ...state.notifications]
          .slice(0, SSE_CONFIG.notificationLimit)
      };
    }),

    clearNotifications: () => set({ notifications: [] }),
    
    markNotificationAsRead: (id) => set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    })),

    markAllAsRead: () => set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    })),

    // === AÇÕES DE SUBSCRIBERS ===
    subscribe: (eventType, callback) => {
      const state = get();
      const newSubscribers = new Map(state.subscribers);
      
      if (!newSubscribers.has(eventType)) {
        newSubscribers.set(eventType, new Set());
      }
      newSubscribers.get(eventType)!.add(callback);
      
      set({ subscribers: newSubscribers });
      
      return () => get().unsubscribe(eventType, callback);
    },

    unsubscribe: (eventType, callback) => set((state) => {
      const newSubscribers = new Map(state.subscribers);
      const eventSubscribers = newSubscribers.get(eventType);
      
      if (eventSubscribers) {
        eventSubscribers.delete(callback);
        if (eventSubscribers.size === 0) {
          newSubscribers.delete(eventType);
        }
      }
      
      return { subscribers: newSubscribers };
    }),

    notifySubscribers: (eventType, data) => {
      const { subscribers } = get();
      const typeSubscribers = subscribers.get(eventType);
      
      if (typeSubscribers) {
        typeSubscribers.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('❌ Erro ao notificar subscriber:', error);
          }
        });
      }
    },

    // === AÇÕES DE FILAS ===
    connectToQueue: (queueId) => {
      if (!queueId) {
        logSSEEvent('error', `parâmetros inválidos para fila ${queueId}`);
        return () => {};
      }

      const state = get();
      const existingConnection = state.queueConnections.get(queueId);
      
      // Verificar conexão existente
      if (existingConnection && existingConnection.eventSource.readyState === EventSource.OPEN) {
        logSSEEvent('connect', `fila ${queueId} já ativa`);
        return () => get().disconnectFromQueue(queueId);
      }

      // Verificar limite de conexões
      const activeCount = get().getActiveConnectionsCount();
      if (activeCount >= SSE_CONFIG.maxConnections) {
        logSSEEvent('error', `limite de conexões atingido (${activeCount}/${SSE_CONFIG.maxConnections})`);
        return () => {};
      }

      const createQueueConnection = (): EventSource | null => {
        try {
          const eventSourceUrl = createSSEUrl(`queue/${queueId}`, queueId);
          const eventSource = new EventSource(eventSourceUrl);

          eventSource.onopen = () => {
            logSSEEvent('connect', `fila ${queueId}`);
            set((state) => {
              const newConnections = new Map(state.queueConnections);
              const connection = newConnections.get(queueId);
              if (connection) {
                connection.reconnectAttempts = 0;
                connection.isReconnecting = false;
              }
              return { queueConnections: newConnections };
            });
          };

          eventSource.onmessage = (event) => {
            const data = parseSSEData(event.data);
            if (!data || isHeartbeatEvent(data)) return;

            logSSEEvent('message', `fila ${queueId}`, data);

            const { addNotification, notifySubscribers } = get();
            
            if (validateEventData(data)) {
              addNotification({
                type: (data.eventType || 'queue-update') as IgniterNotification['type'],
                message: formatNotificationMessage({ ...data, queueId }),
                timestamp: data.timestamp || new Date().toISOString(),
                data: { ...data, queueId }
              });

              notifySubscribers(`queue-${queueId}`, data);
              notifySubscribers('queue-update', data);
            }
          };

          eventSource.onerror = () => {
            const state = get();
            const connection = state.queueConnections.get(queueId);
            
            if (connection && shouldReconnect(eventSource, connection.reconnectAttempts, connection.maxReconnectAttempts)) {
              connection.reconnectAttempts++;
              connection.isReconnecting = true;
              const delay = calculateReconnectDelay(connection.reconnectAttempts);
              
              logSSEEvent('error', `fila ${queueId} - tentativa ${connection.reconnectAttempts}/${connection.maxReconnectAttempts} em ${delay}ms`);
              
              connection.reconnectTimer = setTimeout(() => {
                eventSource.close();
                const newEventSource = createQueueConnection();
                if (newEventSource) {
                  set((state) => {
                    const newConnections = new Map(state.queueConnections);
                    newConnections.set(queueId, {
                      ...connection,
                      eventSource: newEventSource
                    });
                    return { queueConnections: newConnections };
                  });
                }
              }, delay);
            } else {
              logSSEEvent('error', `fila ${queueId} - máximo de tentativas atingido`);
              get().disconnectFromQueue(queueId);
            }
          };

          return eventSource;
        } catch (error) {
          logSSEEvent('error', `falha ao criar conexão fila ${queueId}`, error);
          return null;
        }
      };

      const eventSource = createQueueConnection();
      if (!eventSource) return () => {};

      // Adicionar conexão
      set((state) => {
        const newConnections = new Map(state.queueConnections);
        newConnections.set(queueId, {
          eventSource,
          queueId,
          reconnectAttempts: 0,
          maxReconnectAttempts: SSE_CONFIG.maxReconnectAttempts,
          isReconnecting: false
        });
        return { queueConnections: newConnections };
      });

      return () => get().disconnectFromQueue(queueId);
    },

    disconnectFromQueue: (queueId) => {
      logSSEEvent('disconnect', `fila ${queueId}`);
      
      set((state) => {
        const connection = state.queueConnections.get(queueId);
        if (connection) {
          if (connection.reconnectTimer) {
            clearTimeout(connection.reconnectTimer);
          }
          connection.eventSource.close();
          
          const newConnections = new Map(state.queueConnections);
          newConnections.delete(queueId);
          return { queueConnections: newConnections };
        }
        return state;
      });
    },

    clearAllConnections: () => {
      logSSEEvent('disconnect', 'todas as conexões');
      
      set((state) => {
        // Limpar conexão principal
        if (state.mainEventSource) {
          state.mainEventSource.close();
        }

        // Limpar conexões de fila
        state.queueConnections.forEach((connection) => {
          if (connection.reconnectTimer) {
            clearTimeout(connection.reconnectTimer);
          }
          connection.eventSource.close();
        });
        
        return {
          queueConnections: new Map(),
          subscribers: new Map(),
          notifications: [],
          isConnected: false,
          connectionError: null,
          mainEventSource: null,
          isConnecting: false,
          connectionTimeout: null
        };
      });
    },

    // === SELETORES OTIMIZADOS ===
    getConnectionStatus: () => {
      const { isConnected, connectionError, isConnecting } = get();
      return { isConnected, error: connectionError, isConnecting };
    },

    getNotificationsByType: (type) => {
      const { notifications } = get();
      return notifications.filter(n => n.type === type);
    },

    getUnreadCount: () => {
      const { notifications } = get();
      return notifications.filter(n => !n.read).length;
    },

    getQueueConnectionStatus: (queueId) => {
      const { queueConnections } = get();
      const connection = queueConnections.get(queueId);
      return {
        isConnected: connection ? connection.eventSource.readyState === EventSource.OPEN : false,
        isReconnecting: connection ? connection.isReconnecting : false
      };
    },

    getActiveConnectionsCount: () => {
      const { queueConnections } = get();
      return Array.from(queueConnections.values())
        .filter(conn => conn.eventSource.readyState === EventSource.OPEN).length;
    }
  }))
);

// === HOOKS OTIMIZADOS PARA MIGRAÇÃO ===

// Hook principal - compatibilidade com Context API
export const useIgniter = () => {
  const store = useIgniterStore();
  
  return {
    isConnected: store.isConnected,
    connectionError: store.connectionError,
    notifications: store.notifications,
    subscribe: store.subscribe,
    connectToQueue: (queueId: string) => {
      // Para compatibilidade, precisamos do token via session
      // Será implementado no provider wrapper
      return () => store.disconnectFromQueue(queueId);
    },
    clearNotifications: store.clearNotifications,
    clearAllConnections: store.clearAllConnections
  };
};

// === HOOKS SELETIVOS PARA PERFORMANCE OTIMIZADA ===

// Hook para status de conexão - re-render apenas quando conexão muda
export const useIgniterConnection = () => useIgniterStore(
  (state) => state.getConnectionStatus(),
  (a, b) => a.isConnected === b.isConnected && a.error === b.error && a.isConnecting === b.isConnecting
);

// Hook para notificações - re-render apenas quando notificações mudam
export const useIgniterNotifications = () => useIgniterStore(
  (state) => ({ 
    notifications: state.notifications, 
    unreadCount: state.getUnreadCount(),
    clearNotifications: state.clearNotifications,
    markAsRead: state.markNotificationAsRead,
    markAllAsRead: state.markAllAsRead
  }),
  (a, b) => a.notifications.length === b.notifications.length && a.unreadCount === b.unreadCount
);

// Hook para notificações por tipo específico
export const useIgniterNotificationsByType = (type: string) => useIgniterStore(
  (state) => ({
    notifications: state.getNotificationsByType(type),
    hasUnread: state.getNotificationsByType(type).some(n => !n.read)
  }),
  (a, b) => a.notifications.length === b.notifications.length && a.hasUnread === b.hasUnread
);

// Hook para fila específica - re-render apenas quando essa fila muda
export const useIgniterQueue = (queueId: string) => useIgniterStore(
  (state) => ({ 
    ...state.getQueueConnectionStatus(queueId),
    connectToQueue: () => state.connectToQueue(queueId),
    disconnectFromQueue: () => state.disconnectFromQueue(queueId)
  }),
  (a, b) => a.isConnected === b.isConnected && a.isReconnecting === b.isReconnecting
);


// === HOOKS COMPOSTOS PARA CASOS DE USO ESPECÍFICOS ===

// Hook para mudanças de ticket
export const useTicketChanges = () => useIgniterNotificationsByType('ticket-changed');

// Hook para atualizações de fila
export const useQueueUpdates = (queueId?: string) => {
  const allQueueUpdates = useIgniterNotificationsByType('queue-update');
  
  return {
    queueNotifications: queueId 
      ? allQueueUpdates.notifications.filter(n => (n.data as { queueId?: string })?.queueId === queueId)
      : allQueueUpdates.notifications,
    hasNewQueueUpdates: queueId
      ? allQueueUpdates.notifications.some(n => 
          !n.read && (n.data as { queueId?: string })?.queueId === queueId
        )
      : allQueueUpdates.hasUnread
  };
};

// Hook para alertas de segurança
export const useSecurityAlerts = () => useIgniterNotificationsByType('security-alert');
