import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { apiClient } from './api'
import { env } from '@/config/env'
import { NextAuthUser, NextAuthSession, NextAuthJWT } from '@/types'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const response = await apiClient.login({
            email: credentials.email,
            password: credentials.password
          })

          return {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role,
            tenantId: response.user.tenantId,
            tenant: response.user.tenant,
            accessToken: response.access_token,
            userType: 'agent'
          }
        } catch (error) {
          console.error('NextAuth credentials error:', error instanceof Error ? error.message : error)
          return null
        }
      }
    }),
    CredentialsProvider({
      id: 'superadmin-credentials',
      name: 'superadmin-credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const response = await apiClient.superAdminLogin({
            email: credentials.email,
            password: credentials.password
          })

          return {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: 'SUPERADMIN',
            tenantId: '',
            tenant: undefined,
            accessToken: response.access_token,
            userType: 'superadmin'
          }
        } catch (error) {
          console.error('NextAuth superadmin error:', error instanceof Error ? error.message : error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as NextAuthUser
        const customToken = token as unknown as NextAuthJWT
        customToken.role = customUser.role
        customToken.tenantId = customUser.tenantId
        customToken.tenant = customUser.tenant
        customToken.accessToken = customUser.accessToken
        customToken.userType = customUser.userType
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        const customSession = session as unknown as NextAuthSession
        const customToken = token as unknown as NextAuthJWT
        customSession.user.id = customToken.id
        customSession.user.role = customToken.role
        customSession.user.tenantId = customToken.tenantId
        customSession.user.tenant = customToken.tenant
        customSession.user.accessToken = customToken.accessToken
        customSession.user.userType = customToken.userType
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  secret: env.NEXTAUTH_SECRET
}
