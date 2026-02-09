'use client';

import { useState, useEffect, useCallback } from 'react';
// Zustand direto - sem provider!
import { 
  useIgniterConnection, 
  useQueueUpdates,
  useIgniterStore
} from '@/stores/igniter';
import { useIgniterSession } from '@/lib/igniter-session';
import { Queue, Ticket } from '@/types';

interface RealtimeQueueData {
  queue?: Queue;
  tickets?: Ticket[];
  currentTicket?: string;
  nextTickets?: string[];
  waitingCount?: number;
  completedCount?: number;
  lastUpdated?: string;
}

interface UseRealtimeQueueReturn {
  data: RealtimeQueueData;
  isConnected: boolean;
  lastUpdate: string | null;
  connectionError: string | null;
  forceRefresh: () => void;
}

/**
 * Hook para ouvir atualizações em tempo real de uma fila específica
 */
export function useRealtimeQueue(queueId: string): UseRealtimeQueueReturn {
  // Integração automática com sessão - sem provider!
  useIgniterSession();
  
  const { isConnected, error: connectionError } = useIgniterConnection();
  const { subscribe } = useIgniterStore();
  const { queueNotifications, hasNewQueueUpdates } = useQueueUpdates(queueId);
  
  const [data, setData] = useState<RealtimeQueueData>({});
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Processar notificações de atualização da fila
  useEffect(() => {
    if (queueNotifications.length > 0) {
      const latestNotification = queueNotifications[0];
      const eventData = latestNotification.data;

      if (eventData) {
        const data = eventData as Record<string, unknown>
        setData(prev => ({
          ...prev,
          currentTicket: (data.currentTicket as string) || (data.callingNumber as string) || undefined,
          lastUpdated: data.timestamp as string,
          // Atualizar outros campos baseados no evento
          ...(data.queueName ? { 
            queue: { 
              ...prev.queue, 
              name: data.queueName as string
            } as Queue 
          } : {}),
          ...(data.position ? { waitingCount: data.position as number } : {}),
          ...(data.estimatedWait ? { 
            // Converter tempo estimado de segundos para minutos se necessário
            estimatedWait: typeof data.estimatedWait === 'number' 
              ? Math.round(data.estimatedWait / 60) 
              : data.estimatedWait 
          } : {}),
        }));

        setLastUpdate((data.timestamp as string) || new Date().toISOString());

        console.log(`🔄 Dados da fila ${queueId} atualizados via tempo real:`, data);
      }
    }
  }, [queueNotifications, queueId]);

  // Subscrever a eventos específicos da fila
  useEffect(() => {
    const unsubscribeQueueUpdate = subscribe('queue-update', (eventData) => {
      const data = eventData as Record<string, unknown>
      if (data.queueId === queueId) {
        console.log(`📊 Atualização da fila ${queueId} recebida:`, data);
        
        // Atualizar estado local com dados do evento
        setData(prev => ({
          ...prev,
          currentTicket: (data.currentTicket as string) || (data.callingNumber as string) || undefined,
          nextTickets: (data.nextTickets as string[]) || prev.nextTickets,
          waitingCount: (data.waitingCount as number) || prev.waitingCount,
          completedCount: (data.completedCount as number) || prev.completedCount,
          lastUpdated: data.timestamp as string,
        }));

        setLastUpdate((data.timestamp as string) || new Date().toISOString());
      }
    });

    const unsubscribeTicketCall = subscribe('ticket-called', (eventData) => {
      const data = eventData as Record<string, unknown>
      if (data.queueId === queueId) {
        console.log(`📢 Ticket chamado na fila ${queueId}:`, data);
        
        setData(prev => ({
          ...prev,
          currentTicket: (data.ticketNumber as string) || (data.callingNumber as string) || undefined,
          lastUpdated: data.timestamp as string,
        }));

        setLastUpdate((data.timestamp as string) || new Date().toISOString());
      }
    });

    const unsubscribeTicketComplete = subscribe('ticket-completed', (eventData) => {
      const data = eventData as Record<string, unknown>
      if (data.queueId === queueId) {
        console.log(`✅ Ticket completado na fila ${queueId}:`, data);
        
        setData(prev => ({
          ...prev,
          completedCount: (prev.completedCount || 0) + 1,
          waitingCount: Math.max((prev.waitingCount || 1) - 1, 0),
          lastUpdated: data.timestamp as string,
        }));

        setLastUpdate((data.timestamp as string) || new Date().toISOString());
      }
    });

    return () => {
      unsubscribeQueueUpdate();
      unsubscribeTicketCall();
      unsubscribeTicketComplete();
    };
  }, [queueId, subscribe]);

  // Função para forçar atualização
  const forceRefresh = useCallback(() => {
    console.log(`🔄 Forçando atualização da fila ${queueId}`);
  }, [queueId]);

  // Effect para indicar que há novos dados quando há notificações não lidas
  useEffect(() => {
    if (hasNewQueueUpdates) {
      console.log(`🆕 Novas atualizações disponíveis para a fila ${queueId}`);
    }
  }, [hasNewQueueUpdates, queueId]);

  return {
    data,
    isConnected,
    lastUpdate,
    connectionError,
    forceRefresh,
  };
}

/**
 * Hook para ouvir mudanças específicas de tickets em tempo real
 */
export function useRealtimeTicketChanges() {
  // Usar hook de migração otimizado
  const { subscribe } = useIgniterStore();
  const [ticketChanges, setTicketChanges] = useState<unknown[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<unknown[]>([]);

  useEffect(() => {
    const unsubscribeTicketChanged = subscribe('ticket-changed', (eventData) => {
      const data = eventData as Record<string, unknown>
      console.log('🎫 Mudança de ticket detectada:', data);
      
      setTicketChanges(prev => [{
        id: `ticket-change-${Date.now()}`,
        userId: data.userId,
        userType: data.userType,
        message: data.message,
        timestamp: data.timestamp,
        requiresReauth: data.requiresReauth,
        sessionId: data.sessionId,
      }, ...prev].slice(0, 10));
    });

    const unsubscribeSessionInvalidated = subscribe('session-invalidated', (eventData) => {
      const data = eventData as Record<string, unknown>
      console.log('🚨 Sessão invalidada:', data);
      
      if (data.requiresReauth) {
        console.warn('⚠️ Reautenticação necessária devido à mudança de ticket');
      }
    });

    const unsubscribeSecurityAlert = subscribe('security-alert', (eventData) => {
      const data = eventData as Record<string, unknown>
      console.log('🔐 Alerta de segurança:', data);
      
      setSecurityAlerts(prev => [{
        id: `security-${Date.now()}`,
        type: data.type,
        message: data.message,
        timestamp: data.timestamp,
        severity: (data.severity as string) || 'info',
        userId: data.userId,
        tenantId: data.tenantId,
      }, ...prev].slice(0, 5));
    });

    return () => {
      unsubscribeTicketChanged();
      unsubscribeSessionInvalidated();
      unsubscribeSecurityAlert();
    };
  }, [subscribe]);

  // Usar hooks otimizados para notificações
  const { notifications } = useIgniterStore();
  const ticketNotifications = notifications.filter(n => 
    ['ticket-changed', 'session-invalidated'].includes(n.type)
  );

  const securityNotifications = notifications.filter(n => 
    n.type === 'security-alert'
  );

  return {
    ticketChanges,
    securityAlerts,
    ticketNotifications,
    securityNotifications,
    hasUnreadTicketChanges: ticketNotifications.some(n => !n.read),
    hasUnreadSecurityAlerts: securityNotifications.some(n => !n.read),
  };
}

/**
 * Hook para gerenciar posição do usuário em uma fila específica
 */
export function useRealtimeQueuePosition(queueId: string, userId?: string) {
  const { subscribe } = useIgniterStore();
  const [position, setPosition] = useState<{
    currentPosition: number | null;
    estimatedWait: number | null;
    peopleAhead: number | null;
    ticketNumber: string | null;
    lastUpdated: string | null;
  }>({
    currentPosition: null,
    estimatedWait: null,
    peopleAhead: null,
    ticketNumber: null,
    lastUpdated: null,
  });

  useEffect(() => {
    if (!userId) return;

    const unsubscribePositionUpdate = subscribe('position-update', (eventData) => {
      const data = eventData as Record<string, unknown>
      if (data.queueId === queueId && data.userId === userId) {
        console.log(`📍 Posição atualizada na fila ${queueId} para usuário ${userId}:`, data);
        
        setPosition({
          currentPosition: data.currentPosition as number | null,
          estimatedWait: data.estimatedWait as number | null,
          peopleAhead: data.peopleAhead as number | null,
          ticketNumber: data.ticketNumber as string | null,
          lastUpdated: data.timestamp as string | null,
        });
      }
    });

    return unsubscribePositionUpdate;
  }, [queueId, userId, subscribe]);

  return position;
}

/**
 * Hook para estatísticas de performance em tempo real
 */
export function useRealtimeQueueStats(queueId: string) {
  const { subscribe } = useIgniterStore();
  const [stats, setStats] = useState<{
    averageWaitTime: number | null;
    completionRate: number | null;
    abandonmentRate: number | null;
    totalProcessedToday: number | null;
    activeTickets: number | null;
    lastUpdated: string | null;
  }>({
    averageWaitTime: null,
    completionRate: null,
    abandonmentRate: null,
    totalProcessedToday: null,
    activeTickets: null,
    lastUpdated: null,
  });

  useEffect(() => {
    const unsubscribeStatsUpdate = subscribe('queue-stats-update', (eventData) => {
      const data = eventData as Record<string, unknown>
      if (data.queueId === queueId) {
        console.log(`📈 Estatísticas atualizadas da fila ${queueId}:`, data);
        
        setStats({
          averageWaitTime: data.averageWaitTime as number | null,
          completionRate: data.completionRate as number | null,
          abandonmentRate: data.abandonmentRate as number | null,
          totalProcessedToday: data.totalProcessedToday as number | null,
          activeTickets: data.activeTickets as number | null,
          lastUpdated: data.timestamp as string | null,
        });
      }
    });

    return unsubscribeStatsUpdate;
  }, [queueId, subscribe]);

  return stats;
}


