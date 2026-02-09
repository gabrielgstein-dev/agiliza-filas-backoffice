import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api'
import { Queue, NextAuthSession } from '@/types'

export function useQueues() {
  const [queues, setQueues] = useState<Queue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession() as { data: NextAuthSession | null }

  // Sincronizar token da sessão com ApiClient
  useEffect(() => {
    if (session?.user?.accessToken) {
      console.log('🔑 Sincronizando token da sessão com ApiClient')
      apiClient.setToken(session.user.accessToken)
    }
  }, [session?.user?.accessToken])

  const loadQueues = useCallback(async () => {
    if (!session?.user?.tenantId) return

    const tenantId = session.user.tenantId

    setIsLoading(true)
    setError(null)

    try {
      const data = await apiClient.getQueues(tenantId)
      setQueues(data)
    } catch (err) {
      console.error('Erro ao carregar filas:', err)
      setError('Erro ao carregar filas. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.tenantId])

  const deleteQueue = useCallback(async (queueId: string) => {
    if (!session?.user?.tenantId) return
    
    if (!confirm('Tem certeza que deseja excluir esta fila?')) return

    const tenantId = session.user.tenantId

    try {
      await apiClient.deleteQueue(tenantId, queueId)
      await loadQueues()
    } catch (err) {
      console.error('Erro ao excluir fila:', err)
      setError('Erro ao excluir fila. Tente novamente.')
    }
  }, [session?.user?.tenantId, loadQueues])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Carregar filas quando a sessão estiver disponível
  useEffect(() => {
    if (session?.user?.tenantId) {
      loadQueues()
    }
  }, [session?.user?.tenantId, loadQueues])

  // Estatísticas das filas
  const stats = {
    total: queues.length,
    active: queues.filter(q => q.isActive).length,
    avgServiceTime: queues.length > 0 
      ? Math.round(queues.reduce((acc, q) => acc + q.avgServiceTime, 0) / queues.length)
      : 0,
    totalCapacity: queues.reduce((acc, q) => acc + (q.capacity || 0), 0)
  }

  return {
    queues,
    isLoading,
    error,
    stats,
    loadQueues,
    deleteQueue,
    clearError
  }
}
