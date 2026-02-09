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

interface IgniterState {
  // Estados
  isConnected: boolean;
  connectionError: string | null;
  notifications: IgniterNotification[];
  queueConnections: Map<string, QueueConnection>;
  subscribers: Map<string, Set<(data: unknown) => void>>;
  sseEnabled: boolean;
  mainEventSource: EventSource | null;
  isConnecting: boolean;
}

interface IgniterActions {
  // Controle SSE
  setSseEnabled: (enabled: boolean) => void;
  connectToMainSSE: () => void;
  disconnectFromMainSSE: () => void;
  
  // Notificações
  addNotification: (notification: Omit<IgniterNotification, 'id' | 'read'>) => void;
  clearNotifications: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllAsRead: () => void;
  
  // Subscribers
  subscribe: (eventType: string, callback: (data: unknown) => void) => () => void;
  notifySubscribers: (eventType: string, data: unknown) => void;
  
  // Filas
  connectToQueue: (queueId: string) => () => void;
  disconnectFromQueue: (queueId: string) => void;
  clearAllConnections: () => void;
}

type IgniterStore = IgniterState & IgniterActions;

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

    // === CONTROLE SSE ===
    setSseEnabled: (enabled) => {
      set({ sseEnabled: enabled });
      
      if (!enabled) {
        get().clearAllConnections();
      }
    },

    connectToMainSSE: () => {
      const { isConnecting, mainEventSource } = get();
      
      if (isConnecting || (mainEventSource && mainEventSource.readyState === EventSource.OPEN)) {
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

        eventSource.onerror = () => {
          logSSEEvent('error', 'conexão principal');
          set({ 
            isConnected: false, 
            isConnecting: false,
            connectionError: 'Backend SSE não implementado - aguardando implementação'
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

    // === NOTIFICAÇÕES ===
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

    // === SUBSCRIBERS ===
    subscribe: (eventType, callback) => {
      set((state) => {
        const newSubscribers = new Map(state.subscribers);
        
        if (!newSubscribers.has(eventType)) {
          newSubscribers.set(eventType, new Set());
        }
        newSubscribers.get(eventType)!.add(callback);
        
        return { subscribers: newSubscribers };
      });
      
      return () => {
        set((state) => {
          const newSubscribers = new Map(state.subscribers);
          const eventSubscribers = newSubscribers.get(eventType);
          
          if (eventSubscribers) {
            eventSubscribers.delete(callback);
            if (eventSubscribers.size === 0) {
              newSubscribers.delete(eventType);
            }
          }
          
          return { subscribers: newSubscribers };
        });
      };
    },

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

    // === FILAS ===
    connectToQueue: (queueId) => {
      if (!queueId) {
        return () => {};
      }

      const state = get();
      const existingConnection = state.queueConnections.get(queueId);
      
      if (existingConnection && existingConnection.eventSource.readyState === EventSource.OPEN) {
        return () => get().disconnectFromQueue(queueId);
      }

      const activeCount = Array.from(state.queueConnections.values())
        .filter(conn => conn.eventSource.readyState === EventSource.OPEN).length;
      
      if (activeCount >= SSE_CONFIG.maxConnections) {
        return () => {};
      }

      const createQueueConnection = (): EventSource | null => {
        try {
          const eventSourceUrl = createSSEUrl(`queue/${queueId}/current-ticket`, queueId);
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
              get().disconnectFromQueue(queueId);
            }
          };

          return eventSource;
        } catch {
          return null;
        }
      };

      const eventSource = createQueueConnection();
      if (!eventSource) return () => {};

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
          isConnecting: false
        };
      });
    }
  }))
);

// === HOOKS DIRETOS (SEM PROVIDER) ===

// Hook principal - compatibilidade
export const useIgniter = () => {
  const store = useIgniterStore();
  
  return {
    isConnected: store.isConnected,
    connectionError: store.connectionError,
    notifications: store.notifications,
    subscribe: store.subscribe,
    connectToQueue: store.connectToQueue,
    clearNotifications: store.clearNotifications,
    clearAllConnections: store.clearAllConnections
  };
};

// Hooks seletivos otimizados
export const useIgniterConnection = () => useIgniterStore(
  (state) => ({ 
    isConnected: state.isConnected, 
    error: state.connectionError, 
    isConnecting: state.isConnecting 
  })
);

export const useIgniterNotifications = () => useIgniterStore(
  (state) => ({ 
    notifications: state.notifications, 
    unreadCount: state.notifications.filter(n => !n.read).length,
    clearNotifications: state.clearNotifications,
    markAsRead: state.markNotificationAsRead,
    markAllAsRead: state.markAllAsRead
  })
);

export const useQueueUpdates = (queueId?: string) => {
  const notifications = useIgniterStore(state => state.notifications);
  
  const queueNotifications = notifications.filter(n => {
    if (n.type !== 'queue-update') return false;
    if (!queueId) return true;
    return (n.data as { queueId?: string })?.queueId === queueId;
  });

  return {
    queueNotifications,
    hasNewQueueUpdates: queueNotifications.some(n => !n.read)
  };
};

export const useTicketChanges = () => {
  const notifications = useIgniterStore(state => state.notifications);
  const ticketNotifications = notifications.filter(n => n.type === 'ticket-changed');

  return {
    ticketNotifications,
    hasNewTicketChanges: ticketNotifications.some(n => !n.read)
  };
};

