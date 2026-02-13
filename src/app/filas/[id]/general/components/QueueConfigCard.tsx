'use client'

import { Queue } from '@/types'
import { Settings } from 'lucide-react'

interface QueueConfigCardProps {
  queue: Queue
}

export function QueueConfigCard({ queue }: QueueConfigCardProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg mr-3">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Configurações da Fila
        </h3>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {queue.description || 'Sem descrição disponível'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Capacidade</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {queue.capacity ? `${queue.capacity} pessoas` : 'Ilimitada'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {queue.queueType === 'GENERAL' ? 'Geral' : queue.queueType === 'PRIORITY' ? 'Prioritária' : 'VIP'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tempo médio configurado</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                (Valor inicial - calculado automaticamente em tempo real)
              </span>
            </div>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-400">
              {queue.avgServiceTime ? `${queue.avgServiceTime} min` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
