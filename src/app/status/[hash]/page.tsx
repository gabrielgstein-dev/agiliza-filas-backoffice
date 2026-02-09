import { apiClient } from '@/lib/api'
import { PublicTicketStatus } from '@/types'
import { TicketStatusView } from './components/PublicTicketView'

interface StatusPageProps {
  params: {
    hash: string
  }
}

async function fetchPublicTicketStatus(hash: string): Promise<PublicTicketStatus | null> {
  try {
    const status = await apiClient.getPublicTicketStatus(hash)
    return status
  } catch {
    return null
  }
}

export default async function StatusPage({ params }: StatusPageProps) {
  const status = await fetchPublicTicketStatus(params.hash)

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <span className="text-2xl font-bold">FD</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Ticket não encontrado ou expirado
          </h1>
          <p className="text-sm text-slate-500">
            Verifique se o link está correto ou solicite uma nova senha no local de atendimento.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            Powered by Fila Digital
          </p>
        </div>
      </div>
    )
  }

  return <TicketStatusView guestToken={params.hash} initialStatus={status} />
}


