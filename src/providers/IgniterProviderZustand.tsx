'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useIgniterStore } from '@/stores/igniter-store';
import type { UserWithToken } from '@/types/igniter';

interface IgniterProviderProps {
  children: React.ReactNode;
}

/**
 * Provider wrapper que integra o Zustand store com NextAuth
 * Mantém compatibilidade com a implementação anterior
 */
export function IgniterProvider({ children }: IgniterProviderProps) {
  const { data: session, status } = useSession();
  const { 
    sseEnabled, 
    isConnecting, 
    mainEventSource,
    connectToMainSSE, 
    disconnectFromMainSSE,
    clearAllConnections 
  } = useIgniterStore();

  // Conectar/desconectar baseado na sessão
  useEffect(() => {
    if (status === 'authenticated' && session?.user && sseEnabled) {
      // Verificar se já existe conexão ativa
      if (isConnecting || (mainEventSource && mainEventSource.readyState === EventSource.OPEN)) {
        return;
      }

      const user = session.user as UserWithToken;
      const token = user.accessToken || user.token;
      
      if (token) {
        console.log('🔐 Iniciando conexão SSE com Zustand');
        connectToMainSSE();
      } else {
        console.warn('⚠️ Token não disponível para conexão SSE');
      }
    } else if (status === 'unauthenticated') {
      console.log('🚪 Usuário deslogado, limpando conexões SSE');
      clearAllConnections();
    }

    return () => {
      if (status === 'unauthenticated') {
        disconnectFromMainSSE();
      }
    };
  }, [status, session?.user, sseEnabled, connectToMainSSE, disconnectFromMainSSE, clearAllConnections, isConnecting, mainEventSource]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      clearAllConnections();
    };
  }, [clearAllConnections]);

  return (
    <>
      {children}
    </>
  );
}

