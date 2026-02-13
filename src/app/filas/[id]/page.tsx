'use client'

import { LoadingSpinner } from '@/components/LoadingSpinner'
import { RealtimeNotifications, RealtimeToast } from '@/components/RealtimeNotifications'
import {
    ErrorMessage,
    Tag
} from '@/components/ui'
import { useRealtimeQueueStats } from '@/hooks/useRealtimeQueue'
import { useTicketStream } from '@/hooks/useTicketStream'
import { apiClient } from '@/lib/api'
import { NextAuthSession, Queue, QueueType, QueueStats, Ticket } from '@/types'
import {
    ArrowLeft,
    BarChart3,
    Edit,
    Pause,
    PhoneCall,
    Play,
    Settings,
    Trash2,
    Users
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { GeneralTab } from './general'
import { MaintenanceTab } from './maintain'
import { TicketsTab } from './tickets'

// Removidas todas as funções de cálculo - agora tudo vem do backend

export default function QueueDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession() as { data: NextAuthSession | null, status: string }

  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'maintenance'>('overview')
  const [queue, setQueue] = useState<Queue | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [callingNext, setCallingNext] = useState(false)


  const { queueState } = useTicketStream(params.id as string)
  const realtimeStats = useRealtimeQueueStats(params.id as string)

  // Estados para dados - todos vêm do backend, sem cálculos
  const [queueFlow, setQueueFlow] = useState({
    current: '',
    next: [] as string[],
    lastCalled: '',
    totalProcessed: 0,
    estimatedTimeToNext: 0,
    peakTime: '',
    averageWaitTime: 0,
    completionRate: 0,
  })

  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)

  // Effect para atualizar queueFlow com dados do queueState (SSE)
  useEffect(() => {
    if (queueState) {
      setQueueFlow({
        current: queueState.currentTicket?.myCallingToken || '',
        next: queueState.nextTickets.slice(0, 3).map(t => t.myCallingToken),
        lastCalled: queueState.previousTicket?.myCallingToken || '',
        totalProcessed: queueState.statistics.totalProcessedToday || 0,
        estimatedTimeToNext: queueState.statistics.nextEstimatedTimeMinutes || 0,
        peakTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        averageWaitTime: queueState.statistics.avgWaitTimeMinutes || 0,
        completionRate: queueState.statistics.completionRate || 0,
      })
    }
  }, [queueState])

  // Effect para integrar estatísticas de tempo real (fallback)
  useEffect(() => {
    if (realtimeStats.averageWaitTime !== null || realtimeStats.completionRate !== null) {
      setQueueFlow(prev => ({
        ...prev,
        averageWaitTime: realtimeStats.averageWaitTime || prev.averageWaitTime,
        completionRate: realtimeStats.completionRate || prev.completionRate,
        totalProcessed: realtimeStats.totalProcessedToday || prev.totalProcessed,
      }))
    }
  }, [realtimeStats])

  // Função para buscar dados da fila
  const fetchQueueData = useCallback(async () => {
    if (!session?.user?.tenantId || !params.id) return

    const tenantId = session.user.tenantId
    const queueId = params.id as string

    try {
      setLoading(true)
      setError(null)

      // Buscar dados da fila
      const queueData = await apiClient.getQueue(tenantId, queueId)
      setQueue(queueData)

      // Se a fila tem tickets, usar os dados reais
      if (queueData.tickets) {
        setTickets(queueData.tickets)
      }

      // Buscar estatísticas da fila - todos os dados vêm do backend
      try {
        const stats = await apiClient.getQueueStats(tenantId, queueId)
        setQueueStats(stats)

        // Usar dados do backend diretamente, sem cálculos
        // Se queueState (SSE) ainda não tiver dados, usar stats
        // Todos os valores já vêm calculados do backend
        if (!queueState) {
          setQueueFlow({
            current: '',
            next: [],
            lastCalled: '',
            totalProcessed: stats.performance?.totalProcessedToday || stats.currentStats?.completedToday || 0,
            estimatedTimeToNext: stats.currentStats?.nextEstimatedTimeMinutes || 0,
            peakTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            averageWaitTime: stats.performance?.avgWaitTimeMinutes || 0,
            completionRate: stats.currentStats?.completionRate || 0,
          })
        }
      } catch (statsError) {
        console.warn('Estatísticas não disponíveis:', statsError)
        setQueueStats(null)
      }

    } catch (err) {
      console.error('Erro ao buscar dados da fila:', err)
      setError('Erro ao carregar dados da fila')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.tenantId, params.id, queueState])

  // Effect para carregar dados
  useEffect(() => {
    if (session?.user?.tenantId && params.id) {
      fetchQueueData()
    }
  }, [session?.user?.tenantId, params.id, fetchQueueData])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando detalhes da fila..." />
      </div>
    )
  }

  if (error || !queue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <ErrorMessage
            message={error || 'Fila não encontrada'}
            onDismiss={() => router.push('/filas')}
          />
        </div>
      </div>
    )
  }

  const handleBack = () => {
    router.push('/filas')
  }

  const handleCallNext = async () => {
    if (!session?.user?.tenantId || !queue?.id || callingNext) return

    const tenantId = session.user.tenantId

    try {
      setCallingNext(true)
      setError(null)

      const calledTicket = await apiClient.callNext(tenantId, queue.id)

      console.log('✅ Próxima senha chamada:', calledTicket)

    } catch (err) {
      console.error('❌ Erro ao chamar próxima senha:', err)
      setError('Erro ao chamar próxima senha. Verifique se há tickets na fila.')
    } finally {
      setCallingNext(false)
    }
  }

  const getQueueTypeLabel = (type: QueueType) => {
    switch (type) {
      case QueueType.PRIORITY:
        return { label: 'Prioritária', color: 'amber' }
      case QueueType.VIP:
        return { label: 'VIP', color: 'purple' }
      default:
        return { label: 'Geral', color: 'blue' }
    }
  }

  const queueTypeInfo = getQueueTypeLabel(queue.queueType)

  return (
    <>
      {/* Toast para notificações críticas */}
      <RealtimeToast />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-0 max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-3 hover:bg-white/20 dark:hover:bg-slate-800/50 rounded-xl transition-colors backdrop-blur-sm"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {queue.name}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <Tag variant={queueTypeInfo.color as 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray'}>
                      {queueTypeInfo.label}
                    </Tag>
                    <Tag variant={queue.isActive ? 'green' : 'red'}>
                      {queue.isActive ? 'Ativa' : 'Inativa'}
                    </Tag>

                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Notificações em tempo real */}
              <RealtimeNotifications />

              {/* Botão para chamar próxima senha */}
              <button
                onClick={handleCallNext}
                disabled={callingNext || !queue.isActive}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  callingNext || !queue.isActive
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                } backdrop-blur-sm`}
                title={!queue.isActive ? 'Fila inativa' : 'Chamar próxima senha'}
              >
                {callingNext ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <PhoneCall className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">
                  {callingNext ? 'Chamando...' : 'Chamar Próxima'}
                </span>
              </button>

              <button className="p-3 hover:bg-white/20 dark:hover:bg-slate-800/50 rounded-xl transition-colors backdrop-blur-sm">
                <Edit className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <button className="p-3 hover:bg-white/20 dark:hover:bg-slate-800/50 rounded-xl transition-colors backdrop-blur-sm">
                <Trash2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <button className="p-3 hover:bg-white/20 dark:hover:bg-slate-800/50 rounded-xl transition-colors backdrop-blur-sm">
                {queue.isActive ? <Pause className="w-5 h-5 text-slate-600 dark:text-slate-400" /> : <Play className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'tickets'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Tickets
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'maintenance'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Manutenção
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <GeneralTab
              queue={queue}
              queueFlow={queueFlow}
              queueStats={queueStats}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketsTab
              tickets={tickets}
              queueId={queue.id}
              tenantId={queue.tenantId}
              onTicketAdded={fetchQueueData}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceTab
              queueId={queue.id}
              tenantId={queue.tenantId}
              onStatsUpdate={() => {
                fetchQueueData()
              }}
            />
          )}
        </div>
      </div>
      </div>
    </>
  )
}
