import React from 'react'
import { 
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  Stethoscope,
  TestTube,
  Building,
  AlertTriangle,
  DollarSign,
  Baby,
  Ambulance,
  FileText
} from 'lucide-react'
import { Queue, Ticket, ServiceType } from '@/types'

interface QueueConfirmationProps {
  queue: Queue
  ticket: Ticket
}

export function QueueConfirmation({ queue, ticket }: QueueConfirmationProps) {
  const getServiceTypeInfo = (serviceType: ServiceType) => {
    switch (serviceType) {
      case ServiceType.CONSULTA:
        return { label: '🩺 Consulta Médica', icon: Stethoscope, color: 'blue' }
      case ServiceType.EXAMES:
        return { label: '🔬 Exames', icon: TestTube, color: 'green' }
      case ServiceType.BALCAO:
        return { label: '🏢 Balcão de Atendimento', icon: Building, color: 'gray' }
      case ServiceType.TRIAGEM:
        return { label: '🚨 Triagem', icon: AlertTriangle, color: 'orange' }
      case ServiceType.CAIXA:
        return { label: '💰 Caixa', icon: DollarSign, color: 'yellow' }
      case ServiceType.PEDIATRIA:
        return { label: '👶 Pediatria', icon: Baby, color: 'pink' }
      case ServiceType.URGENCIA:
        return { label: '🚑 Urgência', icon: Ambulance, color: 'red' }
      default:
        return { label: '📋 Atendimento Geral', icon: FileText, color: 'gray' }
    }
  }

  const serviceInfo = getServiceTypeInfo(queue.serviceType)

  const formatEstimatedTime = (minutes?: number) => {
    if (!minutes) return 'calculando...'
    if (minutes < 60) return `${minutes} minutos`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours} hora${hours > 1 ? 's' : ''}`
    return `${hours}h ${remainingMinutes}min`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center p-6">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Senha Retirada com Sucesso!
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Guarde bem seu número da senha
          </p>
        </div>

        {/* Ticket Information */}
        <div className="space-y-6">
          {/* Password Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 text-center">
            <div className="mb-4">
              <span className="text-4xl font-black text-blue-600 dark:text-blue-400">
                {ticket.myCallingToken}
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <serviceInfo.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                {serviceInfo.label}
              </span>
            </div>
          </div>

          {/* Queue Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Fila:
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {queue.name}
              </span>
            </div>

            {ticket.position && (
              <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Posição:
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {ticket.position}º na fila
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Tempo estimado:
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatEstimatedTime(ticket.estimatedTime)}
              </span>
            </div>
          </div>

          {/* Tolerance Notice */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
                  ⏰ Importante:
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Após ser chamado, você tem <strong>{queue.toleranceMinutes} minutos</strong> para comparecer ao atendimento.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 border border-slate-200 dark:border-slate-600">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              📋 Instruções:
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Aguarde sua senha ser chamada</li>
              <li>• Mantenha-se próximo ao local de atendimento</li>
              <li>• Tenha seus documentos em mãos</li>
              <li>• Em caso de dúvidas, procure um atendente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
