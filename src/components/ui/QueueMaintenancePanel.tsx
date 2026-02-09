import React, { useState, useEffect, useCallback } from 'react'
import { 
  Trash2, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { AbandonmentStats, CleanupResponse } from '@/types'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Tag } from './Tag'

interface QueueMaintenancePanelProps {
  queueId: string
  tenantId: string
  onStatsUpdate?: () => void
}

export function QueueMaintenancePanel({ queueId, tenantId, onStatsUpdate }: QueueMaintenancePanelProps) {
  const [stats, setStats] = useState<AbandonmentStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchAbandonmentStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getAbandonmentStats(tenantId, queueId)
      setStats(response)
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err)
      setError('Erro ao carregar estatísticas de abandono')
    } finally {
      setLoading(false)
    }
  }, [tenantId, queueId])

  const handleManualCleanup = async () => {
    if (!confirm('Deseja limpar tickets abandonados desta fila? Esta ação não pode ser desfeita.')) {
      return
    }
    
    setCleanupLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response: CleanupResponse = await apiClient.cleanupQueue(tenantId, queueId)
      setSuccess(`✅ ${response.message} (${response.cleanedCount} tickets removidos)`)
      
      // Atualizar estatísticas após limpeza
      await fetchAbandonmentStats()
      
      // Notificar componente pai para atualizar
      if (onStatsUpdate) {
        onStatsUpdate()
      }
    } catch (err) {
      console.error('Erro na limpeza:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(`❌ Erro na limpeza: ${errorMessage}`)
    } finally {
      setCleanupLoading(false)
    }
  }

  useEffect(() => {
    fetchAbandonmentStats()
  }, [queueId, tenantId, fetchAbandonmentStats])

  const getAbandonmentRateColor = (rate: number): 'green' | 'amber' | 'red' => {
    if (rate <= 10) return 'green'
    if (rate <= 20) return 'amber'
    return 'red'
  }

  const getAbandonmentRateIcon = (rate: number) => {
    if (rate <= 10) return CheckCircle2
    if (rate <= 20) return TrendingUp
    return AlertTriangle
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
              Manutenção da Fila
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Estatísticas e limpeza de tickets
            </p>
          </div>
        </div>
        <button
          onClick={fetchAbandonmentStats}
          disabled={loading}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
          <p className="text-sm text-green-800 dark:text-green-300">
            {success}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-sm text-red-800 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Estatísticas de Abandono */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" text="Carregando estatísticas..." />
        </div>
      ) : stats ? (
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              📊 Estatísticas (últimos 7 dias)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Total de Tickets
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {stats.totalTickets}
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Não Compareceram
                  </span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {stats.noShowTickets}
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Taxa de Abandono
                  </span>
                  <div className="flex items-center space-x-2">
                    <Tag variant={getAbandonmentRateColor(stats.abandonmentRate)}>
                      {stats.abandonmentRate}%
                    </Tag>
                    {React.createElement(getAbandonmentRateIcon(stats.abandonmentRate), {
                      className: `w-4 h-4 ${
                        stats.abandonmentRate <= 10 ? 'text-green-500' :
                        stats.abandonmentRate <= 20 ? 'text-yellow-500' :
                        'text-red-500'
                      }`
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Limpeza Manual */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Limpeza Manual
                </h6>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Remove tickets que ultrapassaram o tempo de tolerância
                </p>
              </div>
              <button 
                onClick={handleManualCleanup}
                disabled={cleanupLoading}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {cleanupLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Limpando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Limpeza Manual</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma estatística disponível
          </p>
        </div>
      )}
    </div>
  )
}
