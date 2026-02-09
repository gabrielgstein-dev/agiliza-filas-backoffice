'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock, RefreshCcw, Ticket as TicketIcon } from 'lucide-react'
import { PublicTicketStatus, TicketStatus } from '@/types'
import { apiClient } from '@/lib/api'

interface TicketStatusViewProps {
  guestToken: string
  initialStatus: PublicTicketStatus
}

export function TicketStatusView({ guestToken, initialStatus }: TicketStatusViewProps) {
  const [status, setStatus] = useState<PublicTicketStatus>(initialStatus)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const isCalled = useMemo(() => {
    return status.status === TicketStatus.CALLED
  }, [status.status])

  const estimatedMinutes = useMemo(() => {
    if (status.estimatedWaitTime === null) {
      return null
    }
    if (status.estimatedWaitTime <= 0) {
      return 0
    }
    return Math.round(status.estimatedWaitTime / 60)
  }, [status.estimatedWaitTime])

  const pollingIntervalMs = useMemo(() => {
    if (isCalled) {
      return null
    }
    if (status.position !== null && status.position <= 5) {
      return 5000
    }
    if (status.position !== null && status.position > 10) {
      return 30000
    }
    return 15000
  }, [isCalled, status.position])

  useEffect(() => {
    if (!isCalled && typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(0)
    }
    if (isCalled && typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(300)
    }
  }, [isCalled])

  useEffect(() => {
    if (pollingIntervalMs === null) {
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const schedule = () => {
      timeoutId = setTimeout(async () => {
        try {
          const updated = await apiClient.getPublicTicketStatus(guestToken)
          setStatus(updated)
        } catch {
          setRefreshError('Não foi possível atualizar. Tente novamente.')
        } finally {
          schedule()
        }
      }, pollingIntervalMs)
    }

    schedule()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [guestToken, pollingIntervalMs])

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true)
      setRefreshError(null)
      const updated = await apiClient.getPublicTicketStatus(guestToken)
      setStatus(updated)
    } catch {
      setRefreshError('Não foi possível atualizar. Tente novamente.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const bgColor = isCalled ? 'bg-emerald-500' : 'bg-white'
  const textColor = isCalled ? 'text-emerald-50' : 'text-slate-900'
  const subTextColor = isCalled ? 'text-emerald-100' : 'text-slate-500'

  return (
    <div className={`min-h-screen flex flex-col justify-between ${bgColor} px-4 py-6`}>
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="text-center">
            <p className={`text-xs font-semibold tracking-[0.2em] uppercase ${subTextColor}`}>
              Fila Digital
            </p>
            <h1 className={`mt-1 text-lg font-semibold ${textColor}`}>
              Acompanhe sua vez em tempo real
            </h1>
          </div>

          <div className={`rounded-3xl px-5 py-4 shadow-sm ${isCalled ? 'bg-emerald-600/60' : 'bg-slate-900 text-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isCalled ? 'bg-emerald-500/60' : 'bg-slate-800'}`}>
                  <TicketIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs uppercase tracking-wide text-slate-300">
                    Fila
                  </span>
                  <span className="text-sm font-semibold line-clamp-1">
                    {status.queueName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-3xl px-6 py-8 shadow-xl ${isCalled ? 'bg-emerald-600' : 'bg-white'}`}>
            <div className="flex flex-col items-center gap-4">
              <span className={`text-xs font-medium tracking-[0.25em] uppercase ${isCalled ? 'text-emerald-50' : 'text-slate-400'}`}>
                Sua senha
              </span>

              <div className={`w-40 h-40 rounded-[2.5rem] flex items-center justify-center shadow-2xl ${isCalled ? 'bg-emerald-500' : 'bg-slate-900'}`}>
                <span className={`text-5xl font-black tracking-wide ${isCalled ? 'text-emerald-50' : 'text-white'}`}>
                  {status.myCallingToken}
                </span>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 mt-4">
                <div className={`rounded-2xl px-3 py-3 ${isCalled ? 'bg-emerald-500/60' : 'bg-slate-100'}`}>
                  <p className={`text-[0.65rem] uppercase tracking-wide ${isCalled ? 'text-emerald-50/80' : 'text-slate-500'}`}>
                    Posição
                  </p>
                  <p className={`mt-1 text-xl font-semibold ${isCalled ? 'text-emerald-50' : 'text-slate-900'}`}>
                    {status.position ?? '---'}
                  </p>
                </div>

                <div className={`rounded-2xl px-3 py-3 ${isCalled ? 'bg-emerald-500/60' : 'bg-slate-100'}`}>
                  <p className={`text-[0.65rem] uppercase tracking-wide ${isCalled ? 'text-emerald-50/80' : 'text-slate-500'}`}>
                    Estimativa
                  </p>
                  <p className={`mt-1 text-xl font-semibold ${isCalled ? 'text-emerald-50' : 'text-slate-900'}`}>
                    {estimatedMinutes !== null ? `${estimatedMinutes} min` : '---'}
                  </p>
                  <p className={`text-[0.65rem] mt-0.5 flex items-center gap-1 ${isCalled ? 'text-emerald-50/70' : 'text-slate-400'}`}>
                    <Clock className="w-3 h-3" />
                    Pode variar
                  </p>
                </div>
              </div>

              {isCalled && (
                <div className="mt-4 w-full rounded-2xl bg-emerald-700/80 px-4 py-3 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-emerald-50" />
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-emerald-50">
                      SUA VEZ!
                    </p>
                    <p className="text-xs text-emerald-100">
                      Dirija-se ao balcão indicado no painel do local.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {refreshError && (
            <div className="rounded-2xl bg-rose-100 text-rose-800 px-4 py-3 text-xs">
              {refreshError}
            </div>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
              isRefreshing
                ? 'bg-slate-200 text-slate-500'
                : 'bg-slate-900 text-white active:scale-[0.99]'
            } transition`}
          >
            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="mt-10 flex flex-col items-center gap-1 text-[0.7rem] text-slate-400">
          <p>Powered by Fila Digital</p>
        </div>
      </div>
    </div>
  )
}



