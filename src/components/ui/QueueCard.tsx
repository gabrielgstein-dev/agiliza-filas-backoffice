import React from 'react'
import { 
  Users, 
  Clock, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  FileText,
  Star,
  Crown
} from 'lucide-react'
import { Queue, QueueType } from '@/types'
import { Tag } from './Tag'

interface QueueCardProps {
  queue: Queue
  onView: (queueId: string) => void
  onEdit: (queueId: string) => void
  onDelete: (queueId: string) => void
}

export function QueueCard({ queue, onView, onEdit, onDelete }: QueueCardProps) {
  const getQueueTypeLabel = (type: QueueType) => {
    switch (type) {
      case QueueType.GENERAL:
        return 'Geral'
      case QueueType.PRIORITY:
        return 'Prioritária'
      case QueueType.VIP:
        return 'VIP'
      default:
        return type
    }
  }

  const getQueueTypeInfo = (type: QueueType) => {
    switch (type) {
      case QueueType.PRIORITY:
        return { icon: Star, bgColor: 'from-amber-500 to-amber-600' }
      case QueueType.VIP:
        return { icon: Crown, bgColor: 'from-purple-500 to-purple-600' }
      default:
        return { icon: FileText, bgColor: 'from-blue-500 to-blue-600' }
    }
  }

  const queueInfo = getQueueTypeInfo(queue.queueType)



  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${queueInfo.bgColor} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            <queueInfo.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {queue.name}
            </h3>
            <div className="flex items-center space-x-2">
              <Tag variant={queue.queueType === QueueType.GENERAL ? 'blue' : queue.queueType === QueueType.PRIORITY ? 'amber' : 'purple'}>
                {getQueueTypeLabel(queue.queueType)}
              </Tag>
            </div>
          </div>
        </div>
        <div className="relative">
          <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {queue.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
          {queue.description}
        </p>
      )}

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Tempo médio
          </span>
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {queue.avgServiceTime ? `${queue.avgServiceTime} min` : 'calculando...'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Capacidade
          </span>
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {queue.capacity ? (
              `${queue.capacity} pessoas`
            ) : (
              <Tag variant="blue">
                Sem limite
              </Tag>
            )}
          </span>
        </div>
        {queue.currentNumber && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Senha atual
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {queue.currentNumber}
            </span>
          </div>
        )}
        {queue.totalWaiting !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Aguardando
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {queue.totalWaiting} pessoas
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Status
          </span>
          <Tag variant={queue.isActive ? 'green' : 'red'}>
            {queue.isActive ? 'Ativa' : 'Inativa'}
          </Tag>
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onView(queue.id)}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          <Eye className="w-4 h-4 mr-2" />
          Visualizar
        </button>
        <button
          onClick={() => onEdit(queue.id)}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors text-sm font-medium text-blue-700 dark:text-blue-400"
        >
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </button>
        <button
          onClick={() => onDelete(queue.id)}
          className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors text-red-700 dark:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
