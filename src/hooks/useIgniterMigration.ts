'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  useIgniter as useIgniterZustand,
  useIgniterNotifications,
  useQueueUpdates as useQueueUpdatesZustand,
  useTicketChanges as useTicketChangesZustand,
  useIgniterStore
} from '@/stores/igniter-store';
import type { UserWithToken } from '@/types/igniter';

/**
 * Hook de migração que mantém compatibilidade com a API anterior
 * Gradualmente será substituído pelos hooks otimizados
 */
export function useIgniter() {
  const { data: session } = useSession();
  const store = useIgniterStore();
  const baseHook = useIgniterZustand();

  // Função connectToQueue com token automático da sessão
  const connectToQueue = (queueId: string) => {
    const user = session?.user as UserWithToken;
    const token = user?.accessToken || user?.token || '';
    
    if (!token) {
      console.warn(`⚠️ Token não disponível para conectar à fila ${queueId}`);
      return () => {};
    }

    return store.connectToQueue(queueId);
  };

  return {
    ...baseHook,
    connectToQueue
  };
}

/**
 * Hook otimizado para mudanças de ticket
 * Substitui useTicketChanges do provider anterior
 */
export function useTicketChanges() {
  const { notifications } = useTicketChangesZustand();
  const { subscribe } = useIgniterStore();
  
  useEffect(() => {
    const unsubscribe = subscribe('ticket-changed', (data) => {
      console.log('🎫 Mudança de ticket detectada via Zustand:', data);
    });

    return unsubscribe;
  }, [subscribe]);

  return {
    ticketNotifications: notifications,
    hasNewTicketChanges: notifications.some(n => !n.read)
  };
}

/**
 * Hook otimizado para atualizações de fila
 * Substitui useQueueUpdates do provider anterior
 */
export function useQueueUpdates(queueId?: string) {
  return useQueueUpdatesZustand(queueId);
}

/**
 * Hook para mudanças específicas de tickets em tempo real
 * Mantém compatibilidade com a API anterior
 */
export function useRealtimeTicketChanges() {
  const { subscribe } = useIgniterStore();
  const { notifications } = useIgniterNotifications();
  
  // Filtrar notificações relacionadas a tickets
  const ticketNotifications = notifications.filter(n => 
    ['ticket-changed', 'session-invalidated'].includes(n.type)
  );

  const securityNotifications = notifications.filter(n => 
    n.type === 'security-alert'
  );

  useEffect(() => {
    const unsubscribeTicketChanged = subscribe('ticket-changed', (eventData) => {
      console.log('🎫 Mudança de ticket detectada:', eventData);
    });

    const unsubscribeSessionInvalidated = subscribe('session-invalidated', (eventData) => {
      console.log('🚨 Sessão invalidada:', eventData);
      
      // Implementar lógica de logout automático se necessário
      if ((eventData as { requiresReauth?: boolean }).requiresReauth) {
        console.warn('⚠️ Reautenticação necessária devido à mudança de ticket');
      }
    });

    const unsubscribeSecurityAlert = subscribe('security-alert', (eventData) => {
      console.log('🔐 Alerta de segurança:', eventData);
    });

    return () => {
      unsubscribeTicketChanged();
      unsubscribeSessionInvalidated();
      unsubscribeSecurityAlert();
    };
  }, [subscribe]);

  return {
    ticketChanges: ticketNotifications.map(n => ({
      id: n.id,
      userId: (n.data as { userId?: string })?.userId,
      userType: (n.data as { userType?: string })?.userType,
      message: n.message,
      timestamp: n.timestamp,
      requiresReauth: (n.data as { requiresReauth?: boolean })?.requiresReauth,
      sessionId: (n.data as { sessionId?: string })?.sessionId,
    })),
    securityAlerts: securityNotifications.map(n => ({
      id: n.id,
      type: (n.data as { type?: string })?.type,
      message: n.message,
      timestamp: n.timestamp,
      severity: (n.data as { severity?: string })?.severity || 'info',
      userId: (n.data as { userId?: string })?.userId,
      tenantId: (n.data as { tenantId?: string })?.tenantId,
    })),
    ticketNotifications,
    securityNotifications,
    hasUnreadTicketChanges: ticketNotifications.some(n => !n.read),
    hasUnreadSecurityAlerts: securityNotifications.some(n => !n.read),
  };
}

/**
 * Hook para gerenciar posição do usuário em uma fila específica
 * Mantém compatibilidade com a API anterior
 */
export function useRealtimeQueuePosition(queueId: string, userId?: string) {
  const { subscribe } = useIgniterStore();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribe('position-update', (eventData) => {
      const data = eventData as {
        queueId?: string;
        userId?: string;
        currentPosition?: number;
        estimatedWait?: number;
        peopleAhead?: number;
        ticketNumber?: string;
        timestamp?: string;
      };

      if (data.queueId === queueId && data.userId === userId) {
        console.log(`📍 Posição atualizada na fila ${queueId} para usuário ${userId}:`, data);
      }
    });

    return unsubscribe;
  }, [queueId, userId, subscribe]);

  // Retornar dados da posição baseados nas notificações
  const { notifications } = useIgniterNotifications();
  const positionNotifications = notifications
    .filter(n => n.type === 'position-update')
    .filter(n => {
      const data = n.data as { queueId?: string; userId?: string };
      return data.queueId === queueId && data.userId === userId;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestPosition = positionNotifications[0];
  const data = latestPosition?.data as {
    currentPosition?: number;
    estimatedWait?: number;
    peopleAhead?: number;
    ticketNumber?: string;
  } | undefined;

  return {
    currentPosition: data?.currentPosition || null,
    estimatedWait: data?.estimatedWait || null,
    peopleAhead: data?.peopleAhead || null,
    ticketNumber: data?.ticketNumber || null,
    lastUpdated: latestPosition?.timestamp || null,
  };
}

/**
 * Hook para estatísticas de performance em tempo real
 * Mantém compatibilidade com a API anterior
 */
export function useRealtimeQueueStats(queueId: string) {
  const { subscribe } = useIgniterStore();

  useEffect(() => {
    const unsubscribe = subscribe('queue-stats-update', (eventData) => {
      const data = eventData as { queueId?: string };
      if (data.queueId === queueId) {
        console.log(`📈 Estatísticas atualizadas da fila ${queueId}:`, data);
      }
    });

    return unsubscribe;
  }, [queueId, subscribe]);

  // Retornar dados das estatísticas baseados nas notificações
  const { notifications } = useIgniterNotifications();
  const statsNotifications = notifications
    .filter(n => n.type === 'queue-update') // stats vêm como queue-update
    .filter(n => {
      const data = n.data as { queueId?: string };
      return data.queueId === queueId;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestStats = statsNotifications[0];
  const data = latestStats?.data as {
    averageWaitTime?: number;
    completionRate?: number;
    abandonmentRate?: number;
    totalProcessedToday?: number;
    activeTickets?: number;
  } | undefined;

  return {
    averageWaitTime: data?.averageWaitTime || null,
    completionRate: data?.completionRate || null,
    abandonmentRate: data?.abandonmentRate || null,
    totalProcessedToday: data?.totalProcessedToday || null,
    activeTickets: data?.activeTickets || null,
    lastUpdated: latestStats?.timestamp || null,
  };
}

