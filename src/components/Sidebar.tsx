'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
  User,
  Users,
  X
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState } from 'react'

interface SidebarProps {
  children: React.ReactNode
}

const menuItems = [
  {
    icon: Home,
    label: 'Dashboard',
    href: '/dashboard',
    color: 'text-blue-500'
  },
  {
    icon: Users,
    label: 'Filas',
    href: '/filas',
    color: 'text-indigo-500'
  },
  {
    icon: BarChart3,
    label: 'Integração',
    href: '/backend-integration',
    color: 'text-purple-500'
  },
  {
    icon: Settings,
    label: 'Documentação',
    href: '/docs',
    color: 'text-green-500'
  },
  {
    icon: Settings,
    label: 'Configurações',
    href: '/configuracoes',
    color: 'text-orange-500',
    disabled: true
  }
]

export function Sidebar({ children }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full pointer-events-auto">
      {/* Header */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-4 border-b border-slate-200 dark:border-slate-700`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">
                Fila Digital
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Backoffice
              </p>
            </div>
          </div>
        )}

        {/* Toggle button for desktop */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
        </button>

        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* User Info */}
      {!isCollapsed && user && (
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user.name}
              </p>
              <div className="flex items-center space-x-2">
                <Shield className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.role === 'ADMIN' ? 'Admin' :
                   user.role === 'MANAGER' ? 'Gerente' : 'Atendente'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <button
              key={item.href}
              onClick={() => !item.disabled && router.push(item.href)}
              disabled={item.disabled}
              className={`
                w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                ${active
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : item.disabled
                    ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-600 dark:text-blue-400' : item.color} ${isCollapsed ? '' : 'flex-shrink-0'}`} />
              {!isCollapsed && (
                <span className="font-medium text-sm truncate">
                  {item.label}
                </span>
              )}
              {!isCollapsed && item.disabled && (
                <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full ml-auto">
                  Em breve
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`
            w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition-colors
            text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-500" />
          )}
          {!isCollapsed && (
            <span className="font-medium text-sm">
              {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition-colors
            text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && (
            <span className="font-medium text-sm">
              Sair
            </span>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out z-50 relative pointer-events-auto
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Fila Digital
              </span>
            </div>
            <div className="w-10" /> {/* Spacer for center alignment */}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
