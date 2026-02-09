'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { env } from '@/config/env';

interface IgniterContextType {
  isConnected: boolean;
  connectionError: string | null;
  notifications: IgniterNotification[];
  subscribe: (eventType: string, callback: (data: unknown) => void) => () => void;
  connectToQueue: (queueId: string) => () => void;
  clearNotifications: () => void;
  clearAllConnections: () => void;
}

interface IgniterNotification {
  id: string;
  type: 'ticket-changed' | 'session-invalidated' | 'security-alert' | 'queue-update' | 'position-update';
  message: string;
  timestamp: string;
  data?: unknown;
  read: boolean;
}


const IgniterContext = createContext<IgniterContextType>({
  isConnected: false,
  connectionError: null,
  notifications: [],
  subscribe: () => () => {},
  connectToQueue: () => () => {},
  clearNotifications: () => {},
  clearAllConnections: () => {},
});

export function IgniterProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<IgniterNotification[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [queueEventSources, setQueueEventSources] = useState<Map<string, EventSource>>(new Map());
  const [subscribers, setSubscribers] = useState<Map<string, Set<(data: unknown) => void>>>(new Map());
  
  // Flag para desabilitar SSE temporariamente até a API estar funcionando
  const [sseEnabled, setSseEnabled] = useState(false);

  // Função para adicionar notificação
  const addNotification = useCallback((notification: Omit<IgniterNotification, 'id' | 'read'>) => {
    const id = `${notification.type}-${Date.now()}-${Math.random()}`;
    setNotifications(prev => [{
      ...notification,
      id,
      read: false
    }, ...prev].slice(0, 50)); // Manter apenas as 50 mais recentes
  }, []);

  // Função para notificar subscribers
  const notifySubscribers = useCallback((eventType: string, data: unknown) => {
    const typeSubscribers = subscribers.get(eventType);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Erro ao notificar subscriber:', error);
        }
      });
    }
  }, [subscribers]);

  // Conectar ao SSE principal (mudanças de ticket e eventos de segurança)
  const connectToMainSSE = useCallback(() => {
    if (!session?.user) return;

    try {
      console.log('🔐 Conectando ao stream de tickets...');
      
      // Remover /api/v1 da URL base, pois SSE não usa /api/v1
      const baseUrl = env.API_URL.replace('/api/v1', '');
      const eventSourceUrl = `${baseUrl}/api/rt/tickets/stream`;
      console.log('🌐 Conectando ao SSE:', eventSourceUrl);
      
      const newEventSource = new EventSource(eventSourceUrl);

      // Adicionar headers de autorização manualmente não é possível no EventSource
      // A autenticação deve ser feita via cookies ou query params na API

      newEventSource.onopen = () => {
        console.log('✅ Conectado ao SSE principal do Igniter');
        setIsConnected(true);
        setConnectionError(null);
      };

      newEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Pular heartbeats
          if (data.type === 'heartbeat') return;

          console.log('📡 Evento recebido:', data);

          // Adicionar como notificação
          addNotification({
            type: data.eventType,
            message: data.message,
            timestamp: data.timestamp,
            data: data
          });

          // Notificar subscribers específicos
          notifySubscribers(data.eventType, data);
          notifySubscribers('*', data); // Subscribers gerais

          // Tratar eventos específicos
          if (data.eventType === 'ticket-changed' && data.requiresReauth) {
            // Forçar logout/reautenticação
            console.warn('🔐 Ticket alterado - reautenticação necessária');
            // Você pode implementar logout automático aqui se necessário
          }

        } catch (error) {
          console.error('❌ Erro ao processar evento SSE:', error);
        }
      };

      newEventSource.onerror = (error) => {
        console.error('❌ Erro na conexão SSE principal:', error);
        setConnectionError('Erro na conexão com o backend');
        setIsConnected(false);
        
        console.log('⚠️ Verifique se o backend está rodando');
      };

      setEventSource(newEventSource);

      return () => {
        newEventSource.close();
      };
    } catch (error) {
      console.error('❌ Erro ao conectar SSE principal:', error);
      setConnectionError('Erro ao estabelecer conexão');
    }
  }, [session?.user, addNotification, notifySubscribers]);

  // Conectar a uma fila específica
  const connectToQueue = useCallback((queueId: string) => {
    if (!session?.user) {
      return () => {};
    }

    // Verificar se já existe conexão para esta fila
    if (queueEventSources.has(queueId)) {
      console.log(`🔄 Conexão SSE já existe para fila ${queueId}`);
      return () => {
        const existingSource = queueEventSources.get(queueId);
        if (existingSource) {
          existingSource.close();
          setQueueEventSources(prev => {
            const newMap = new Map(prev);
            newMap.delete(queueId);
            return newMap;
          });
        }
      };
    }

    // Limitar número de conexões simultâneas
    if (queueEventSources.size >= 3) {
      console.warn(`⚠️ Limite de conexões SSE atingido (${queueEventSources.size}/3). Não conectando à fila ${queueId}`);
      return () => {};
    }

    try {
      // Remover /api/v1 da URL base, pois SSE não usa /api/v1
      const baseUrl = env.API_URL.replace('/api/v1', '');
      const eventSourceUrl = `${baseUrl}/api/rt/tickets/stream?queueId=${queueId}`;
      const queueEventSource = new EventSource(eventSourceUrl);

      queueEventSource.onopen = () => {
        console.log(`✅ Conectado ao SSE da fila ${queueId}`);
      };

      queueEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Pular heartbeats
          if (data.type === 'queue-heartbeat') return;

          console.log(`📡 Evento da fila ${queueId}:`, data);

          // Adicionar como notificação
          addNotification({
            type: data.eventType || 'queue-update',
            message: `Fila ${data.queueName || queueId}: ${data.currentTicket || 'Atualização'}`,
            timestamp: data.timestamp,
            data: { ...data, queueId }
          });

          // Notificar subscribers específicos da fila
          notifySubscribers(`queue-${queueId}`, data);
          notifySubscribers('queue-update', data);

        } catch (error) {
          console.error(`❌ Erro ao processar evento da fila ${queueId}:`, error);
        }
      };

      queueEventSource.onerror = (error) => {
        console.error(`❌ Erro na conexão SSE da fila ${queueId}:`, error);
        
        // Fechar conexão com erro
        queueEventSource.close();
        setQueueEventSources(prev => {
          const newMap = new Map(prev);
          newMap.delete(queueId);
          return newMap;
        });
        
        // NÃO reconectar automaticamente para evitar loop infinito
        // A reconexão será feita manualmente pelo usuário ou por outro componente
      };

      setQueueEventSources(prev => new Map(prev).set(queueId, queueEventSource));

      return () => {
        queueEventSource.close();
        setQueueEventSources(prev => {
          const newMap = new Map(prev);
          newMap.delete(queueId);
          return newMap;
        });
      };
    } catch (error) {
      console.error(`❌ Erro ao conectar à fila ${queueId}:`, error);
      return () => {};
    }
  }, [session?.user, addNotification, notifySubscribers, queueEventSources]);

  // Função para subscrever a eventos específicos
  const subscribe = useCallback((eventType: string, callback: (data: unknown) => void) => {
    setSubscribers(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(eventType)) {
        newMap.set(eventType, new Set());
      }
      newMap.get(eventType)!.add(callback);
      return newMap;
    });

    // Retornar função de cleanup
    return () => {
      setSubscribers(prev => {
        const newMap = new Map(prev);
        const eventSubscribers = newMap.get(eventType);
        if (eventSubscribers) {
          eventSubscribers.delete(callback);
          if (eventSubscribers.size === 0) {
            newMap.delete(eventType);
          }
        }
        return newMap;
      });
    };
  }, []);

  // Limpar notificações
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Limpar todas as conexões SSE
  const clearAllConnections = useCallback(() => {
    console.log('🧹 Limpando todas as conexões SSE...');
    
    // Fechar conexão principal
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    
    // Fechar todas as conexões de fila
    queueEventSources.forEach((source, queueId) => {
      console.log(`🔌 Fechando conexão da fila ${queueId}`);
      source.close();
    });
    
    // Limpar mapas
    setQueueEventSources(new Map());
    setConnectionError(null);
    
    console.log('✅ Todas as conexões SSE foram limpas');
  }, [eventSource, queueEventSources]);

  // Effect para conectar/desconectar baseado na sessão
  useEffect(() => {
    // Só tentar conectar se SSE estiver habilitado e estiver autenticado
    if (sseEnabled && status === 'authenticated' && session?.user) {
      console.log('🔐 Tentando conectar ao SSE com token válido');
      const cleanup = connectToMainSSE();
      return cleanup;
    } else if (status === 'unauthenticated') {
      // Limpar conexões quando deslogado
      console.log('🚪 Usuário não autenticado, limpando conexões SSE');
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      
      // Fechar todas as conexões de fila
      queueEventSources.forEach(source => source.close());
      setQueueEventSources(new Map());
      
      setIsConnected(false);
      setConnectionError(null);
      setNotifications([]);
      setSubscribers(new Map());
    }
    // Não fazer nada se status for 'loading' ou SSE estiver desabilitado
  }, [sseEnabled, status, session?.user, connectToMainSSE, eventSource, queueEventSources]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      queueEventSources.forEach(source => source.close());
    };
  }, [eventSource, queueEventSources]);

  return (
    <IgniterContext.Provider value={{
      isConnected,
      connectionError,
      notifications,
      subscribe,
      connectToQueue,
      clearNotifications,
      clearAllConnections
    }}>
      {/* Botão temporário para habilitar/desabilitar SSE */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{
            background: sseEnabled ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            userSelect: 'none'
          }} onClick={() => setSseEnabled(!sseEnabled)}>
            SSE: {sseEnabled ? 'ON' : 'OFF'}
          </div>
          
          <div style={{
            background: '#f59e0b',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            userSelect: 'none'
          }} onClick={clearAllConnections}>
            🧹 Limpar Conexões
          </div>
          
          {sseEnabled && connectionError && (
            <div style={{
              background: '#f59e0b',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              userSelect: 'none'
            }} onClick={() => {
              if (status === 'authenticated' && session?.user) {
                connectToMainSSE();
              }
            }}>
              🔄 Reconectar
            </div>
          )}
        </div>
      )}
      {children}
    </IgniterContext.Provider>
  );
}

export function useIgniter() {
  const context = useContext(IgniterContext);
  if (!context) {
    throw new Error('useIgniter deve ser usado dentro de IgniterProvider');
  }
  return context;
}

// Hook específico para mudanças de ticket
export function useTicketChanges() {
  const { subscribe, notifications } = useIgniter();
  const [ticketNotifications, setTicketNotifications] = useState<IgniterNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe('ticket-changed', (data) => {
      console.log('🎫 Mudança de ticket detectada:', data);
    });

    // Filtrar notificações de ticket
    const ticketNotifs = notifications.filter(n => n.type === 'ticket-changed');
    setTicketNotifications(ticketNotifs);

    return unsubscribe;
  }, [subscribe, notifications]);

  return {
    ticketNotifications,
    hasNewTicketChanges: ticketNotifications.some(n => !n.read)
  };
}

// Hook específico para atualizações de fila
export function useQueueUpdates(queueId?: string) {
  const { subscribe, connectToQueue, notifications } = useIgniter();
  const [queueNotifications, setQueueNotifications] = useState<IgniterNotification[]>([]);

  useEffect(() => {
    if (!queueId) return;

    // Conectar à fila específica
    const disconnectFromQueue = connectToQueue(queueId);

    // Subscrever a atualizações da fila
    const unsubscribe = subscribe(`queue-${queueId}`, (data) => {
      console.log(`🏢 Atualização da fila ${queueId}:`, data);
    });

    return () => {
      unsubscribe();
      disconnectFromQueue();
    };
  }, [queueId, subscribe, connectToQueue]);

  useEffect(() => {
    // Filtrar notificações da fila específica
    const queueNotifs = notifications.filter(n => 
      n.type === 'queue-update' && 
      (!queueId || (n.data as { queueId?: string })?.queueId === queueId)
    );
    setQueueNotifications(queueNotifs);
  }, [notifications, queueId]);

  return {
    queueNotifications,
    hasNewQueueUpdates: queueNotifications.some(n => !n.read)
  };
}

