import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/safeNext'

// NOTE: with a `src/` directory Next.js only picks up `src/middleware.ts`
// (a root-level middleware.ts is silently ignored).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not set')
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() validates the JWT with Supabase (getSession() only reads the cookie)
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('Middleware auth check failed', err)
  }

  const { pathname, search } = request.nextUrl

  const loginRedirect = (next?: string) => {
    const url = new URL('/auth/login', request.url)
    if (next) url.searchParams.set('next', next)
    return NextResponse.redirect(url)
  }

  // Onboarding needs a session (the profile is saved against it)
  if (!user && (pathname === '/auth/onboarding' || pathname.startsWith('/auth/onboarding/'))) {
    return loginRedirect(safeNextPath(request.nextUrl.searchParams.get('next'), ''))
  }

  // Auth pages (login, signup, OAuth callback) and invitation links are public
  if (pathname.startsWith('/auth/') || pathname === '/join' || pathname.startsWith('/join/')) {
    return response
  }

  // Unauthenticated -> login, remembering where they were going (same-origin relative path only)
  if (!user) {
    return loginRedirect(pathname === '/' ? '' : safeNextPath(`${pathname}${search}`, ''))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Run on page navigations only. Skipped:
     * - api/ (each route authenticates itself and returns JSON 401/403)
     * - _next/static, _next/image (build assets)
     * - PWA files: manifest.json, sw.js, workbox-*.js
     * - favicon / icons / avatars and any static image or font file
     */
    '/((?!api/|_next/static|_next/image|favicon|manifest\\.json|sw\\.js|workbox-|icons/|avatars/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?|map|txt|xml)$).*)',
  ],
}
