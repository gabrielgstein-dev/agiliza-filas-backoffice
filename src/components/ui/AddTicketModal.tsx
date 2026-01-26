'use client'

import React, { useState, useEffect } from 'react'
import { X, UserPlus } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { apiClient } from '@/lib/api'
import { Agent } from '@/types'

interface AddTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    clientName: string
    clientPhone: string
    clientEmail?: string
    clientCpf: string
    priority?: number
    preferredAgentId?: string
  }) => Promise<void>
  tenantId: string
}

export function AddTicketModal({ isOpen, onClose, onSubmit, tenantId }: AddTicketModalProps) {
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientCpf, setClientCpf] = useState('')
  const [priority, setPriority] = useState(1)
  const [preferredAgentId, setPreferredAgentId] = useState<string>('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && tenantId) {
      setLoadingAgents(true)
      apiClient.getAgents(tenantId)
        .then(setAgents)
        .catch(() => setAgents([]))
        .finally(() => setLoadingAgents(false))
    }
  }, [isOpen, tenantId])

  if (!isOpen) return null

  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    
    if (numbers.length <= 2) {
      return numbers
    }
    if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setClientPhone(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!clientName.trim()) {
      setError('Nome é obrigatório')
      setLoading(false)
      return
    }

    if (!clientCpf.trim()) {
      setError('CPF é obrigatório')
      setLoading(false)
      return
    }

    if (clientCpf.replace(/\D/g, '').length !== 11) {
      setError('CPF deve conter 11 dígitos')
      setLoading(false)
      return
    }

    if (!clientPhone.trim()) {
      setError('Telefone é obrigatório')
      setLoading(false)
      return
    }

    const phoneNumbers = clientPhone.replace(/\D/g, '')
    if (phoneNumbers.length !== 11) {
      setError('Telefone deve conter DDD + 9 dígitos (11 números no total)')
      setLoading(false)
      return
    }

    try {
      await onSubmit({
        clientName: clientName,
        clientPhone: phoneNumbers,
        clientEmail: clientEmail || undefined,
        clientCpf: clientCpf.replace(/\D/g, ''),
        priority: priority,
        preferredAgentId: preferredAgentId || undefined,
      })

      setClientName('')
      setClientPhone('')
      setClientEmail('')
      setClientCpf('')
      setPriority(1)
      setPreferredAgentId('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar pessoa na fila')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Adicionar Pessoa na Fila
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Digite o nome do cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              CPF <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientCpf}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setClientCpf(value)
              }}
              maxLength={11}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Digite o CPF (apenas números)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Telefone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientPhone}
              onChange={handlePhoneChange}
              maxLength={15}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              E-mail (Opcional)
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Digite o e-mail"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Atendente Específico (Opcional)
            </label>
            <select
              value={preferredAgentId}
              onChange={(e) => setPreferredAgentId(e.target.value)}
              disabled={loadingAgents}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
            >
              <option value="">Qualquer atendente disponível (Fila Geral)</option>
              {agents
                .filter(agent => agent.isActive)
                .map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} - {agent.status === 'AVAILABLE' ? '✓ Disponível' : '⏳ Ocupado'}
                  </option>
                ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {preferredAgentId 
                ? '⚠️ Cliente só será atendido pelo atendente escolhido' 
                : '✓ Cliente será atendido pelo próximo atendente disponível'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Prioridade
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value={1}>Normal (1)</option>
              <option value={2}>Média (2)</option>
              <option value={3}>Alta (3)</option>
              <option value={5}>Muito Alta (5)</option>
              <option value={10}>Urgente (10)</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Adicionando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Adicionar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

