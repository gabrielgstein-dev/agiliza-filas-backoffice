'use client'

import React, { useState } from 'react'
import { Users, UserPlus } from 'lucide-react'
import { TicketDisplay, EmptyState, AddTicketModal } from '@/components/ui'
import { Ticket } from '@/types'
import { apiClient } from '@/lib/api'

interface TicketsTabProps {
  tickets: Ticket[]
  queueId: string
  tenantId: string
  onTicketAdded: () => void
}

export function TicketsTab({ tickets, queueId, tenantId, onTicketAdded }: TicketsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleAddTicket = async (data: {
    clientName: string
    clientPhone: string
    clientEmail?: string
    clientCpf: string
    priority?: number
    preferredAgentId?: string
  }) => {
    await apiClient.createTicket(queueId, data)
    onTicketAdded()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-5 h-5" />
          <span>Adicionar Pessoa</span>
        </button>
      </div>

      {tickets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tickets.map((ticket) => (
            <TicketDisplay key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Nenhum ticket encontrado"
          description="Esta fila não possui tickets no momento."
        />
      )}

      <AddTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTicket}
        tenantId={tenantId}
      />
    </div>
  )
}
