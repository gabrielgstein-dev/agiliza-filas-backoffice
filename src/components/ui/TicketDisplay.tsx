import React from 'react'
import { 
  User, 
  Phone, 
  Mail, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Play,
  XCircle,
  Hash,
  type LucideIcon
} from 'lucide-react'
import { Ticket, TicketStatus } from '@/types'
import { Tag } from './Tag'

interface TicketDisplayProps {
  ticket: Ticket
  showQueueInfo?: boolean
}

export function TicketDisplay({ ticket, showQueueInfo = false }: TicketDisplayProps) {
  const getPasswordType = (token: string) => {
    const prefix = token.replace(/\d+$/, '')
    
    const types: Record<string, { label: string; color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray' }> = {
      'B': { label: 'Balcão', color: 'gray' },
      'BP': { label: 'Balcão Prioritário', color: 'amber' },
      'C': { label: 'Consulta', color: 'blue' },
      'CP': { label: 'Consulta Prioritária', color: 'blue' },
      'E': { label: 'Exames', color: 'green' },
      'EP': { label: 'Exames Prioritários', color: 'green' },
      'T': { label: 'Triagem', color: 'amber' },
      'TP': { label: 'Triagem Prioritária', color: 'amber' },
      'X': { label: 'Caixa', color: 'amber' },
      'XP': { label: 'Caixa Prioritário', color: 'amber' },
      'P': { label: 'Pediatria', color: 'purple' },
      'PP': { label: 'Pediatria Prioritária', color: 'purple' },
      'U': { label: 'Urgência', color: 'red' },
      'G': { label: 'Geral', color: 'gray' },
      'GP': { label: 'Geral Prioritário', color: 'gray' },
    }
    
    return types[prefix] || { label: 'Geral', color: 'gray' }
  }

  const getStatusInfo = (status: TicketStatus): { label: string; color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray'; icon: LucideIcon } => {
    switch (status) {
      case TicketStatus.WAITING:
        return { label: 'Aguardando', color: 'blue', icon: Clock }
      case TicketStatus.CALLED:
        return { label: 'Chamado', color: 'amber', icon: AlertCircle }
      case TicketStatus.IN_SERVICE:
        return { label: 'Em Atendimento', color: 'green', icon: Play }
      case TicketStatus.COMPLETED:
        return { label: 'Concluído', color: 'green', icon: CheckCircle2 }
      case TicketStatus.NO_SHOW:
        return { label: 'Não Compareceu', color: 'red', icon: XCircle }
      case TicketStatus.CANCELLED:
        return { label: 'Cancelado', color: 'gray', icon: XCircle }
      default:
        return { label: status, color: 'gray', icon: Clock }
    }
  }

  const passwordType = getPasswordType(ticket.myCallingToken)
  const statusInfo = getStatusInfo(ticket.status)

  const formatTime = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatEstimatedTime = (minutes?: number) => {
    if (!minutes) return 'Calculando...'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min`
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6 hover:shadow-2xl transition-all duration-200">
      {/* Header do Ticket */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${
            passwordType.color === 'blue' ? 'from-blue-500 to-blue-600' :
            passwordType.color === 'green' ? 'from-green-500 to-green-600' :
            passwordType.color === 'amber' ? 'from-amber-500 to-amber-600' :
            passwordType.color === 'red' ? 'from-red-500 to-red-600' :
            passwordType.color === 'purple' ? 'from-purple-500 to-purple-600' :
            'from-gray-500 to-gray-600'
          } rounded-xl flex items-center justify-center shadow-lg`}>
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {ticket.myCallingToken}
              </span>
              <Tag variant={passwordType.color}>
                {passwordType.label}
              </Tag>
            </div>
            <div className="flex items-center space-x-2">
              <Tag variant={statusInfo.color}>
                <statusInfo.icon className="w-3 h-3 mr-1" />
                {statusInfo.label}
              </Tag>
              {ticket.position && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Posição: {ticket.position}º
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Cliente */}
      {(ticket.clientName || ticket.clientPhone || ticket.clientEmail) && (
        <div className="space-y-2 mb-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
          <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Informações do Cliente
          </h6>
          {ticket.clientName && (
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {ticket.clientName}
              </span>
            </div>
          )}
          {ticket.clientPhone && (
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {ticket.clientPhone}
              </span>
            </div>
          )}
          {ticket.clientEmail && (
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {ticket.clientEmail}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Informações da Fila */}
      {showQueueInfo && ticket.queue && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h6 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Informações da Fila
          </h6>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <strong>Fila:</strong> {ticket.queue.name}
          </p>
        </div>
      )}

      {/* Aviso de Tolerância para tickets chamados */}

      {/* Estatísticas do Ticket */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Criado em:
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {formatTime(ticket.createdAt) || 'N/A'}
            </span>
          </div>
          {ticket.calledAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Chamado em:
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {formatTime(ticket.calledAt)}
              </span>
            </div>
          )}
          {ticket.completedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Concluído em:
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {formatTime(ticket.completedAt)}
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Tempo estimado:
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {formatEstimatedTime(ticket.estimatedTime)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Prioridade:
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {ticket.priority || 'Normal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
