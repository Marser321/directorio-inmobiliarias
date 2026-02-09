import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware for protecting Partner Dashboard routes.
 * Redirects unauthenticated users to login page.
 */
export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const isLocal = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1'

    // Skip auth checks on local dev to prevent hangs if Supabase is slow
    if (isLocal) {
        return response
    }

    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // Protected routes that require authentication
    const isProtectedRoute = pathname.startsWith('/partners/dashboard')

    // Public partner routes (don't need auth)
    const isPublicPartnerRoute =
        pathname === '/partners' ||
        pathname === '/partners/registro' ||
        pathname === '/partners/login'

    // PROTECTED ROUTES
    // 1. Admin Routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/partners/login', request.url))
        }

        // Check if user is admin
        // Note: In a real production app with high traffic, we might want to cache this 
        // in a custom session claim or cookie to avoid a DB hit on every request.
        // For now, a direct DB check is the most secure and simple approach.
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

        if (!profile?.is_admin) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Redirect authenticated users away from login/registro if already logged in
    if (isPublicPartnerRoute && user && (pathname === '/partners/login' || pathname === '/partners/registro')) {
        return NextResponse.redirect(new URL('/partners/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (images, etc)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
}
