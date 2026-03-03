import { NextResponse, type NextRequest } from 'next/server'
import { INSFORGE_ACCESS_COOKIE } from '@/lib/insforge/cookies'

type ProxyFeatureFlags = {
  featureInsforgeAuth: boolean
  featureInsforgeProperties: boolean
  featureInsforgeScraper: boolean
  featureInsforgeMarketing: boolean
  featureInsforgeManager: boolean
}

function asBool(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

function getProxyFeatureFlags(): ProxyFeatureFlags {
  return {
    featureInsforgeAuth: asBool(process.env.FEATURE_INSFORGE_AUTH, true),
    featureInsforgeProperties: asBool(process.env.FEATURE_INSFORGE_PROPERTIES, false),
    featureInsforgeScraper: asBool(process.env.FEATURE_INSFORGE_SCRAPER, false),
    featureInsforgeMarketing: asBool(process.env.FEATURE_INSFORGE_MARKETING, false),
    featureInsforgeManager: asBool(process.env.FEATURE_INSFORGE_MANAGER, false),
  }
}

export async function proxy(request: NextRequest) {
  const env = getProxyFeatureFlags()

  if (!env.featureInsforgeAuth) {
    return NextResponse.next()
  }

  const token = request.cookies.get(INSFORGE_ACCESS_COOKIE)?.value
  const { pathname } = request.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isProtectedRoute = pathname.startsWith('/partners/dashboard') || isAdminRoute
  const isPropertiesRoute = pathname.startsWith('/partners/dashboard/new')
  const isScraperRoute = pathname.startsWith('/partners/dashboard/sniper')
  const isMarketingRoute = pathname.startsWith('/partners/dashboard/marketing')
  const isManagerRoute = pathname.startsWith('/partners/dashboard/manager')

  const isPublicPartnerRoute =
    pathname === '/partners' ||
    pathname === '/partners/registro' ||
    pathname === '/partners/login'

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/partners/login', request.url))
  }

  if (token) {
    if (isPropertiesRoute && !env.featureInsforgeProperties) {
      return NextResponse.redirect(new URL('/partners/dashboard', request.url))
    }
    if (isScraperRoute && !env.featureInsforgeScraper) {
      return NextResponse.redirect(new URL('/partners/dashboard', request.url))
    }
    if (isMarketingRoute && !env.featureInsforgeMarketing) {
      return NextResponse.redirect(new URL('/partners/dashboard', request.url))
    }
    if (isManagerRoute && !env.featureInsforgeManager) {
      return NextResponse.redirect(new URL('/partners/dashboard', request.url))
    }
  }

  if (isPublicPartnerRoute && token && (pathname === '/partners/login' || pathname === '/partners/registro')) {
    return NextResponse.redirect(new URL('/partners/dashboard', request.url))
  }

  if (isAdminRoute && token) {
    try {
      const meResponse = await fetch(new URL('/api/auth/me', request.url), {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
        cache: 'no-store',
      })

      if (meResponse.ok) {
        const me = await meResponse.json()
        if (!me?.profile?.is_admin && me?.profile?.role !== 'platform_admin') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    } catch {
      return NextResponse.redirect(new URL('/partners/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
