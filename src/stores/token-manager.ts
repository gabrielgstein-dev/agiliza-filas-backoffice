import React from 'react';
import { createWithEqualityFn } from 'zustand/traditional';
import { subscribeWithSelector } from 'zustand/middleware';
import { useSession, signOut } from 'next-auth/react';
import { igniterClient } from '@/lib/igniter-client';
import { toast } from 'sonner';
import type { NextAuthSession } from '@/types';

export type TokenStatus = 'valid' | 'expiring' | 'expired' | 'loading';

export interface TokenManagerState {
  status: TokenStatus;
  timeRemaining: string;
  shouldRefresh: boolean;
  sessionInfo: unknown;
  isRefreshing: boolean;
  warningShown: boolean;
}

interface TokenManagerActions {
  setTokenState: (tokenState: Partial<TokenManagerState>) => void;
  setIsRefreshing: (isRefreshing: boolean) => void;
  setWarningShown: (warningShown: boolean) => void;
  refreshToken: () => Promise<void>;
  handleTokenExpired: () => void;
  checkTokenStatus: (session: NextAuthSession | null, sessionStatus: string) => Promise<void>;
  resetWarning: () => void;
  startPeriodicCheck: (session: unknown, sessionStatus: string) => void;
  stopPeriodicCheck: () => void;
}

interface TokenManagerStore extends TokenManagerState, TokenManagerActions {
  intervalId: ReturnType<typeof setInterval> | null;
  autoRefreshTimer: ReturnType<typeof setTimeout> | null;
}

export const useTokenManagerStore = createWithEqualityFn<TokenManagerStore>()(
  subscribeWithSelector((set, get) => ({
    // Estado inicial
    status: 'loading',
    timeRemaining: '',
    shouldRefresh: false,
    sessionInfo: null,
    isRefreshing: false,
    warningShown: false,
    intervalId: null,
    autoRefreshTimer: null,

    // Ações
    setTokenState: (tokenState) => set((state) => ({ ...state, ...tokenState })),
    
    setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
    
    setWarningShown: (warningShown) => set({ warningShown }),

    resetWarning: () => set({ warningShown: false }),

    handleTokenExpired: () => {
      toast.error('Sessão Expirada', {
        description: 'Sua sessão expirou. Você será redirecionado para o login.',
      });
      
      signOut({ 
        callbackUrl: '/login?reason=token_expired',
        redirect: true 
      });
    },

    checkTokenStatus: async (session, sessionStatus) => {
      const customSession = session as NextAuthSession | null;
      if (sessionStatus !== 'authenticated' || !customSession?.user?.accessToken) {
        set({ status: 'expired' });
        return;
      }

      try {
        const tokenStatus = await igniterClient.getTokenStatus();
        const sessionInfo = await igniterClient.getSessionInfo();

        const newState = {
          status: tokenStatus.shouldRefresh ? 'expiring' as TokenStatus : 'valid' as TokenStatus,
          timeRemaining: tokenStatus.timeToExpire,
          shouldRefresh: tokenStatus.shouldRefresh,
          sessionInfo,
        };

        set(newState);

        const { warningShown, refreshToken } = get();

        // Mostrar aviso se está expirando e ainda não foi mostrado
        if (tokenStatus.shouldRefresh && !warningShown) {
          set({ warningShown: true });
          toast.warning('Sessão Expirando', {
            description: `Sua sessão expirará em ${tokenStatus.timeToExpire}. Clique para renovar.`,
            action: {
              label: 'Renovar',
              onClick: () => refreshToken(),
            },
            duration: 30000, // 30 segundos
          });
        }

        // Reset warning se não está mais expirando
        if (!tokenStatus.shouldRefresh && warningShown) {
          set({ warningShown: false });
        }

      } catch (error) {
        console.error('❌ Erro ao verificar status do token:', error);
        set({ status: 'expired' });
        get().handleTokenExpired();
      }
    },

    refreshToken: async () => {
      const { isRefreshing } = get();
      if (isRefreshing) return;

      set({ isRefreshing: true });
      try {
        const result = await igniterClient.refreshToken();
        
        // Atualizar token no cliente
        igniterClient.setToken(result.access_token);
        
        // Resetar estado de aviso
        set({ warningShown: false });
        
        toast.success('Token Renovado', {
          description: 'Sua sessão foi renovada com sucesso!',
        });

        // Verificar status novamente após refresh
        // Nota: Isso será chamado pelo hook que usa a store
        
      } catch (error) {
        console.error('❌ Erro ao renovar token:', error);
        toast.error('Erro ao Renovar', {
          description: 'Não foi possível renovar sua sessão. Você será redirecionado para o login.',
        });
        get().handleTokenExpired();
      } finally {
        set({ isRefreshing: false });
      }
    },

    startPeriodicCheck: () => {
      // Funcionalidade desabilitada - não há necessidade de verificação periódica
    },

    stopPeriodicCheck: () => {
      const { intervalId, autoRefreshTimer } = get();
      
      if (intervalId) {
        clearInterval(intervalId as ReturnType<typeof setInterval>);
        set({ intervalId: null });
      }

      if (autoRefreshTimer) {
        clearTimeout(autoRefreshTimer);
        set({ autoRefreshTimer: null });
      }
    }
  }))
);

// Hook principal que integra com NextAuth e gerencia o ciclo de vida
export function useTokenManager() {
  const { data: session, status: sessionStatus } = useSession();
  const {
    status,
    timeRemaining,
    shouldRefresh,
    sessionInfo,
    isRefreshing,
    warningShown,
    refreshToken,
    handleTokenExpired,
    checkTokenStatus,
    startPeriodicCheck,
    stopPeriodicCheck
  } = useTokenManagerStore();

  // Configurar token no cliente Igniter quando a sessão estiver disponível
  React.useEffect(() => {
    const customSession = session as NextAuthSession | null;
    if (customSession?.user?.accessToken) {
      igniterClient.setToken(customSession.user.accessToken);
    }
  }, [session]);

  // Gerenciar verificação periódica
  React.useEffect(() => {
    if (sessionStatus === 'authenticated') {
      startPeriodicCheck(session as unknown as NextAuthSession | null, sessionStatus);
    } else {
      stopPeriodicCheck();
    }

    return () => stopPeriodicCheck();
  }, [session, sessionStatus, startPeriodicCheck, stopPeriodicCheck]);

  // Auto-refresh quando necessário
  React.useEffect(() => {
    if (shouldRefresh && !isRefreshing && !warningShown) {
      // Auto-refresh silencioso após 2 minutos de aviso
      const autoRefreshTimer = setTimeout(() => {
        refreshToken();
      }, 2 * 60 * 1000); // 2 minutos

      useTokenManagerStore.setState({ autoRefreshTimer });

      return () => {
        if (autoRefreshTimer) {
          clearTimeout(autoRefreshTimer);
        }
      };
    }
  }, [shouldRefresh, isRefreshing, warningShown, refreshToken]);

  return {
    tokenState: {
      status,
      timeRemaining,
      shouldRefresh,
      sessionInfo,
    },
    isRefreshing,
    refreshToken,
    handleTokenExpired,
    checkTokenStatus: () => checkTokenStatus(session as unknown as NextAuthSession | null, sessionStatus),
  };
}

// Hook simplificado para componentes que só precisam do status
export function useTokenStatus() {
  return useTokenManagerStore(
    (state) => ({
      status: state.status,
      timeRemaining: state.timeRemaining,
      shouldRefresh: state.shouldRefresh,
    }),
    (a, b) => a.status === b.status && a.timeRemaining === b.timeRemaining && a.shouldRefresh === b.shouldRefresh
  );
}

// Hook para ações de refresh
export function useTokenRefresh() {
  return useTokenManagerStore(
    (state) => ({
      refreshToken: state.refreshToken,
      isRefreshing: state.isRefreshing,
    }),
    (a, b) => a.isRefreshing === b.isRefreshing
  );
}

// Hook para controle de warning
export function useTokenWarning() {
  return useTokenManagerStore(
    (state) => ({
      warningShown: state.warningShown,
      resetWarning: state.resetWarning,
    }),
    (a, b) => a.warningShown === b.warningShown
  );
}
