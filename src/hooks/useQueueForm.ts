import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api'
import { QueueType, NextAuthSession, CreateQueueDto } from '@/types'

// Schema de validação
const createQueueSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  description: z.string()
    .max(200, 'Descrição deve ter no máximo 200 caracteres')
    .optional(),
  queueType: z.nativeEnum(QueueType, {
    errorMap: () => ({ message: 'Selecione um tipo de fila válido' })
  }),
  hasCapacityLimit: z.boolean().default(false),
  capacity: z.number().optional()
}).refine((data) => {
  if (data.hasCapacityLimit) {
    if (!data.capacity) {
      return false;
    }
    if (data.capacity < 1 || data.capacity > 1000) {
      return false;
    }
  }
  return true;
}, {
  message: 'Quando limite de capacidade está ativo, a capacidade deve ser entre 1 e 1000',
  path: ['capacity']
})

export type CreateQueueFormData = z.infer<typeof createQueueSchema>

export function useQueueForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { data: session } = useSession() as { data: NextAuthSession | null }

  // Configuração do formulário
  const form = useForm<CreateQueueFormData>({
    resolver: zodResolver(createQueueSchema),
    defaultValues: {
      queueType: QueueType.GENERAL,
      hasCapacityLimit: false,
    },
  })

  // Sincronizar token da sessão com ApiClient
  useEffect(() => {
    if (session?.user?.accessToken) {
      console.log('🔑 Sincronizando token da sessão com ApiClient')
      apiClient.setToken(session.user.accessToken)
    }
  }, [session?.user?.accessToken])

  // Handler para submissão do formulário
  const onSubmit = async (data: CreateQueueFormData) => {
    console.log('🎯 HOOK onSubmit executado!')
    console.log('🚀 Formulário submetido com dados RAW:', data)
    
    // Limpar capacity se hasCapacityLimit for false
    const cleanedData = {
      ...data,
      capacity: data.hasCapacityLimit ? data.capacity : undefined
    }
    
    console.log('🧹 Dados limpos:', cleanedData)
    console.log('🔗 ApiClient configurado para:', apiClient)
    
    if (!session?.user?.tenantId) {
      console.error('❌ Sessão inválida - tenantId não encontrado')
      setError('Sessão inválida. Faça login novamente.')
      return
    }

    setIsLoading(true)
    setError(null)

    const payload: CreateQueueDto = {
      name: cleanedData.name,
      description: cleanedData.description || undefined,
      queueType: cleanedData.queueType,
      ...(cleanedData.capacity && { capacity: cleanedData.capacity }),
    }

    console.log('📤 Enviando payload para API:', payload)

    const tenantId = session.user.tenantId

    try {
      const result = await apiClient.createQueue(tenantId, payload)
      console.log('✅ Fila criada com sucesso:', result)

      setSuccess(true)
      
      // Redirecionar após sucesso
      setTimeout(() => {
        router.push('/filas')
      }, 2000)

    } catch (err) {
      console.error('❌ Erro ao criar fila:', err)
      setError(err instanceof Error ? err.message : 'Erro ao criar fila. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handler para voltar
  const handleBack = () => {
    router.push('/filas')
  }

  // Limpar erro
  const clearError = () => {
    setError(null)
  }

  // Limpar sucesso
  const clearSuccess = () => {
    setSuccess(false)
  }

  return {
    form,
    isLoading,
    error,
    success,
    onSubmit: form.handleSubmit(onSubmit),
    handleBack,
    clearError,
    clearSuccess,
    // Expor métodos do form para facilitar uso
    register: form.register,
    formState: form.formState,
    watch: form.watch,
    setValue: form.setValue,
    reset: form.reset
  }
}
