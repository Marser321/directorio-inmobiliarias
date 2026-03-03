import { createServerClient } from '@/lib/insforge/compat-ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ReactNode } from 'react'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
        process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Access Denied</div>
    }

    // Double check admin status
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, full_name')
        .eq('id', user.id)
        .single<{ is_admin: boolean; full_name?: string | null }>()

    if (!profile?.is_admin) {
        return <div>Access Denied: Super Admin Only</div>
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                        Empire Builder
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Super Admin Panel</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/admin/agencies" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <span className="text-xl">🏢</span>
                        <span>Inmobiliarias</span>
                    </Link>
                    <Link href="/admin/properties" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <span className="text-xl">🏠</span>
                        <span>Propiedades</span>
                    </Link>
                    <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <span className="text-xl">👥</span>
                        <span>Usuarios</span>
                    </Link>
                    <Link href="/admin/logs" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <span className="text-xl">🛡️</span>
                        <span>Audit Logs</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                            {profile?.full_name?.[0] || 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">Admin</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
