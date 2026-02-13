'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { 
  Hash, 
  Users, 
  Save,
  CheckCircle2,
  Settings,
  ArrowLeft
} from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { 
  FormCard,
  FormField,
  FormSelect,
  FormTextarea,
  ErrorMessage
} from '@/components/ui'
import { useQueueForm } from '@/hooks/useQueueForm'
import { QueueType, NextAuthSession } from '@/types'

export default function NewQueuePage() {
  const { status } = useSession() as { data: NextAuthSession | null, status: string }
  
  const {
    register,
    formState: { errors },
    isLoading,
    error,
    success,
    onSubmit,
    handleBack,
    clearError,
    watch,
    setValue
  } = useQueueForm()


  const hasCapacityLimit = watch('hasCapacityLimit')

  // Limpar o campo capacity quando o checkbox é desmarcado
  React.useEffect(() => {
    if (!hasCapacityLimit) {
      setValue('capacity', undefined)
    }
  }, [hasCapacityLimit, setValue])

  // Estados de carregamento e autenticação
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-0 max-w-7xl mx-auto px-6 py-8">
        {/* Page Header com botão de voltar customizado */}
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
                    Nova Fila
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Configure uma nova fila de atendimento inteligente
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <FormCard
          title="Criar Nova Fila de Atendimento"
          subtitle="Preencha as informações abaixo para configurar uma nova fila"
          badge={{
            label: 'Configuração Inteligente',
            icon: Settings
          }}
        >
          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Fila criada com sucesso!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Redirecionando para a lista de filas...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <ErrorMessage 
              message={error} 
              onDismiss={clearError}
            />
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome da Fila */}
              <FormField
                {...register('name')}
                id="name"
                label="Nome da Fila"
                icon={Hash}
                placeholder="Ex: Atendimento Geral"
                error={errors.name}
                required
              />

              {/* Tipo de Fila */}
              <FormSelect
                {...register('queueType')}
                id="queueType"
                label="Tipo de Fila"
                error={errors.queueType}
                required
              >
                <option value={QueueType.GENERAL}>Geral</option>
                <option value={QueueType.PRIORITY}>Prioritária</option>
                <option value={QueueType.VIP}>VIP</option>
              </FormSelect>

            </div>

            {/* Descrição */}
            <FormTextarea
              {...register('description')}
              id="description"
              label="Descrição"
              placeholder="Descreva o propósito e características desta fila..."
              rows={4}
              error={errors.description}
              helperText="Informações adicionais sobre a fila (opcional)"
            />

            {/* Checkbox para Limite de Capacidade */}
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <input
                {...register('hasCapacityLimit')}
                id="hasCapacityLimit"
                type="checkbox"
                className="w-5 h-5 text-blue-600 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <div>
                <label
                  htmlFor="hasCapacityLimit"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Definir limite de capacidade
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Marque para definir um número máximo de pessoas na fila
                </p>
              </div>
            </div>

            {/* Campo de Capacidade Condicional */}
            {hasCapacityLimit && (
              <FormField
                {...register('capacity', { valueAsNumber: true })}
                id="capacity"
                type="number"
                label="Capacidade Máxima"
                icon={Users}
                placeholder="50"
                error={errors.capacity}
                helperText="Número máximo de pessoas na fila"
                required
              />
            )}



            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                    Criar Fila
                  </>
                )}
              </button>
            </div>
          </form>
        </FormCard>
      </div>
    </div>
  )
}