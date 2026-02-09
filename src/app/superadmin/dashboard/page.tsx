'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  ShieldAlert,
  Building2,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  LogOut,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Tenant, CreateTenantPayload, TenantWithAdmin } from '@/types'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export default function SuperAdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [createdTenant, setCreatedTenant] = useState<TenantWithAdmin | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const customSession = session as { user?: { userType?: string; accessToken?: string; name?: string; email?: string } } | null

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true)
      if (customSession?.user?.accessToken) {
        apiClient.setToken(customSession.user.accessToken)
      }
      const data = await apiClient.getTenants()
      setTenants(data)
    } catch (err) {
      toast.error('Erro ao carregar tenants')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [customSession?.user?.accessToken])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login')
      return
    }

    if (customSession?.user?.userType !== 'superadmin' && status === 'authenticated') {
      router.push('/superadmin/login')
      return
    }

    if (status === 'authenticated' && customSession?.user?.accessToken) {
      loadTenants()
    }
  }, [status, customSession?.user?.userType, customSession?.user?.accessToken, router, loadTenants])

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando painel..." />
      </div>
    )
  }

  const handleToggleActive = async (tenantId: string) => {
    setActionLoading(tenantId)
    try {
      await apiClient.toggleTenantActive(tenantId)
      await loadTenants()
      toast.success('Status do tenant alterado')
    } catch {
      toast.error('Erro ao alterar status do tenant')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (tenantId: string) => {
    setActionLoading(tenantId)
    try {
      await apiClient.deleteTenant(tenantId)
      setShowDeleteConfirm(null)
      await loadTenants()
      toast.success('Tenant removido com sucesso')
    } catch {
      toast.error('Erro ao remover tenant')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/superadmin/login' })
  }

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-red-500/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Super Admin</h1>
              <p className="text-xs text-slate-400">{customSession?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Gestão de Tenants</h2>
            <p className="text-slate-400 text-sm mt-1">
              {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} cadastrado{tenants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadTenants}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium rounded-lg transition-all text-sm shadow-lg shadow-red-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Tenant</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, slug ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredTenants.length === 0 && !loading ? (
            <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                {search ? 'Nenhum tenant encontrado para esta busca' : 'Nenhum tenant cadastrado'}
              </p>
            </div>
          ) : (
            filteredTenants.map((tenant) => (
              <div
                key={tenant.id}
                className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tenant.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-semibold truncate">{tenant.name}</h3>
                      {tenant.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                          <XCircle className="w-3 h-3 mr-1" /> Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5">/{tenant.slug}</p>
                    {tenant.email && (
                      <p className="text-slate-400 text-xs mt-1">{tenant.email}</p>
                    )}
                    <p className="text-slate-600 text-xs mt-1">
                      Criado em {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(tenant.id)}
                    disabled={actionLoading === tenant.id}
                    className={`p-2 rounded-lg transition-colors border ${
                      tenant.isActive
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    } disabled:opacity-50`}
                    title={tenant.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {actionLoading === tenant.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : tenant.isActive ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(tenant.id)}
                    disabled={actionLoading === tenant.id}
                    className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Remover tenant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {showDeleteConfirm === tenant.id && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                      <h3 className="text-lg font-bold text-white mb-2">Confirmar exclusão</h3>
                      <p className="text-slate-400 text-sm mb-1">
                        Tem certeza que deseja excluir o tenant <strong className="text-white">{tenant.name}</strong>?
                      </p>
                      <p className="text-red-400 text-xs mb-6">
                        Esta ação é irreversível. Todos os dados do tenant serão perdidos.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.id)}
                          disabled={actionLoading === tenant.id}
                          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center"
                        >
                          {actionLoading === tenant.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Excluir'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateTenantModal
          onClose={() => {
            setShowCreateModal(false)
            setCreatedTenant(null)
          }}
          onCreated={(tenant) => {
            setCreatedTenant(tenant)
            loadTenants()
          }}
          createdTenant={createdTenant}
        />
      )}
    </div>
  )
}

function CreateTenantModal({
  onClose,
  onCreated,
  createdTenant,
}: {
  onClose: () => void
  onCreated: (tenant: TenantWithAdmin) => void
  createdTenant: TenantWithAdmin | null
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState<CreateTenantPayload>({
    name: '',
    slug: '',
    email: '',
    phone: '',
    adminEmail: '',
    adminName: '',
    adminPassword: '',
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.slug) {
      toast.error('Nome e slug são obrigatórios')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateTenantPayload = {
        name: form.name,
        slug: form.slug,
      }
      if (form.email) payload.email = form.email
      if (form.phone) payload.phone = form.phone
      if (form.adminEmail) {
        payload.adminEmail = form.adminEmail
        if (form.adminName) payload.adminName = form.adminName
        if (form.adminPassword) payload.adminPassword = form.adminPassword
      }

      const tenant = await apiClient.createTenant(payload)
      toast.success('Tenant criado com sucesso!')
      onCreated(tenant)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar tenant'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdTenant) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-800 border border-emerald-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Tenant Criado!</h3>
          </div>

          <div className="space-y-3 mb-6">
            <InfoRow label="Nome" value={createdTenant.name} />
            <InfoRow label="Slug" value={createdTenant.slug} />
            {createdTenant.email && <InfoRow label="Email" value={createdTenant.email} />}
            {createdTenant.adminUser && (
              <>
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Administrador</p>
                </div>
                <InfoRow label="Nome" value={createdTenant.adminUser.name} />
                <InfoRow label="Email" value={createdTenant.adminUser.email} copyable />
                {createdTenant.temporaryPassword && (
                  <InfoRow label="Senha temporária" value={createdTenant.temporaryPassword} copyable sensitive />
                )}
              </>
            )}
          </div>

          {createdTenant.temporaryPassword && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
              <p className="text-orange-400 text-xs">
                Guarde a senha temporária! Ela não poderá ser visualizada novamente.
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Criar Novo Tenant</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Nome da Empresa *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Clínica São Paulo"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="clinica-sao-paulo"
              className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contato@empresa.com"
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4">
            <p className="text-sm font-medium text-slate-300 mb-3">
              Administrador Inicial <span className="text-slate-500 text-xs">(opcional)</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email do Admin</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
                  placeholder="admin@empresa.com"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Admin</label>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm((prev) => ({ ...prev, adminName: e.target.value }))}
                  placeholder="João Silva"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Senha do Admin <span className="text-slate-600">(deixe vazio para gerar automaticamente)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.adminPassword}
                    onChange={(e) => setForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full px-4 py-2.5 pr-10 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 flex items-center justify-center"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  copyable,
  sensitive,
}: {
  label: string
  value: string
  copyable?: boolean
  sensitive?: boolean
}) {
  const [visible, setVisible] = useState(!sensitive)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    toast.success(`${label} copiado!`)
  }

  return (
    <div className="flex items-center justify-between bg-slate-700/30 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-white font-mono truncate">
          {visible ? value : '••••••••'}
        </p>
      </div>
      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
        {sensitive && (
          <button
            onClick={() => setVisible(!visible)}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
