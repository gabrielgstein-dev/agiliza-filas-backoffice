'use client';

import React, { useState, useEffect } from 'react';
// Zustand direto - sem provider!
import { useIgniterNotifications } from '@/stores/igniter';
import { useIgniterSession } from '@/lib/igniter-session';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  Info, 
  Zap, 
  Users,
  Clock
} from 'lucide-react';

interface RealtimeNotificationsProps {
  className?: string;
}

export function RealtimeNotifications({ className = '' }: RealtimeNotificationsProps) {
  // Integração automática com sessão - sem provider!
  useIgniterSession();
  
  const { notifications, clearNotifications } = useIgniterNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // Detectar novas notificações
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    setHasNewNotifications(unreadCount > 0);
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket-changed':
        return <Zap className="w-4 h-4 text-orange-500" />;
      case 'session-invalidated':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'security-alert':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'queue-update':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'position-update':
        return <Clock className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'ticket-changed':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'session-invalidated':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'security-alert':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'queue-update':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'position-update':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-l-slate-500 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 10); // Mostrar apenas as 10 mais recentes

  return (
    <div className={`relative ${className}`}>
      {/* Botão de notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 hover:bg-white/20 dark:hover:bg-slate-800/50 rounded-xl transition-colors backdrop-blur-sm"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        
        {/* Badge de notificações não lidas */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
        
        {/* Indicador de pulsação para novas notificações */}
        {hasNewNotifications && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping" />
        )}
      </button>

      {/* Painel de notificações */}
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Painel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Notificações em Tempo Real
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={clearNotifications}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  disabled={notifications.length === 0}
                >
                  Limpar tudo
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Lista de notificações */}
            <div className="max-h-96 overflow-y-auto">
              {recentNotifications.length > 0 ? (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                        !notification.read ? 'font-medium' : 'opacity-75'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 dark:text-white">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatTimestamp(notification.timestamp)}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          
                          {/* Dados adicionais da notificação */}
                          {/* {notification.data && (
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                              {notification.type === 'queue-update' && notification.data.currentTicket && (
                                <span>Senha atual: {notification.data.currentTicket}</span>
                              )}
                              {notification.type === 'ticket-changed' && notification.data.requiresReauth && (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  ⚠️ Reautenticação necessária
                                </span>
                              )}
                            </div>
                          )} */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Nenhuma notificação ainda
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    As atualizações em tempo real aparecerão aqui
                  </p>
                </div>
              )}
            </div>

            {/* Footer com status */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-slate-600 dark:text-slate-400">
                    Conectado ao tempo real
                  </span>
                </div>
                <span className="text-slate-500 dark:text-slate-500">
                  {notifications.length} total
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Hook para notificações toast (opcional)
interface ToastNotification {
  id: string
  message: string
  type: string
  timestamp: string
}

export function useRealtimeToast() {
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);

  const dismissToast = (id: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    toastNotifications,
    dismissToast
  };
}

// Componente de toast para notificações críticas
export function RealtimeToast() {
  const { toastNotifications, dismissToast } = useRealtimeToast();

  if (toastNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toastNotifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-right"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {notification.type === 'ticket-changed' && (
                <Zap className="w-5 h-5 text-orange-500" />
              )}
              {notification.type === 'session-invalidated' && (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              {notification.type === 'security-alert' && (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {notification.message}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {new Date(notification.timestamp).toLocaleTimeString('pt-BR')}
              </p>
            </div>
            <button
              onClick={() => dismissToast(notification.id)}
              className="flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


