'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Search,
    Shield,
    MoreVertical,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ImpersonateButton } from './impersonate-button'
import { CreateUserDialog } from '@/components/admin/create-user-dialog'

interface Profile {
    id: string
    full_name: string
    role: string
    phone: string
    created_at: string
    agency: {
        name: string
    }[] | null // Joined via agency_memberships
}

export default function AdminUsers() {
    const [users, setUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const loadUsers = useCallback(async (): Promise<Profile[]> => {
        const supabase = getSupabaseBrowserClient()
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (error || !data) return []
        return data as Profile[]
    }, [])

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        const nextUsers = await loadUsers()
        setUsers(nextUsers)
        setLoading(false)
    }, [loadUsers])

    useEffect(() => {
        let active = true
        void loadUsers().then((nextUsers) => {
            if (!active) return
            setUsers(nextUsers)
            setLoading(false)
        })

        return () => {
            active = false
        }
    }, [loadUsers])

    const filteredUsers = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.role || '').toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return <div>Cargando...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">
                        Gestión de <span className="text-gold">Usuarios</span>
                    </h1>
                    <p className="text-muted-foreground">Control de acceso y roles del sistema.</p>
                </div>
                <CreateUserDialog onUserCreated={fetchUsers} />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o rol..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:border-gold outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass-card rounded-2xl border border-border/40 overflow-hidden shadow-2xl shadow-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border/40">
                            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                                <th className="p-4 font-bold">Usuario</th>
                                <th className="p-4 font-bold">Rol</th>
                                <th className="p-4 font-bold">Contacto</th>
                                <th className="p-4 font-bold">Fecha Registro</th>
                                <th className="p-4 font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                                                <span className="font-bold text-gold">
                                                    {(user.full_name || 'U')[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{user.full_name || 'Sin Nombre'}</p>
                                                <p className="text-xs text-muted-foreground text-ellipsis overflow-hidden max-w-[150px]">{user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${user.role === 'platform_admin'
                                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                            : user.role === 'agency_admin'
                                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                : user.role === 'agent'
                                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                : 'bg-green-500/10 text-green-500 border-green-500/20'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            {user.phone && (
                                                <p className="text-xs flex items-center gap-1 text-muted-foreground">
                                                    <span className="text-foreground">{user.phone}</span>
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-muted-foreground">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <ImpersonateButton userId={user.id} userName={user.full_name} />
                                            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                                                <Shield className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
