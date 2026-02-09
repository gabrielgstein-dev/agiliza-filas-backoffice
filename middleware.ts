import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const { token } = req.nextauth

    if (pathname === '/login' && token) {
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/dashboard'
      return NextResponse.redirect(new URL(callbackUrl, req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        if (pathname.startsWith('/status')) {
          return true
        }
        
        if (pathname.startsWith('/superadmin')) {
          return true
        }
        
        if (pathname === '/login') {
          return true
        }
        
        if (pathname === '/') {
          return true
        }
        
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
