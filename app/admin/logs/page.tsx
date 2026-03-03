import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database.types'

type AdminLogWithAdmin = Database['public']['Tables']['admin_logs']['Row'] & {
    admin?: {
        full_name?: string | null
    } | null
}

export default async function AdminLogsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/partners/login')

    // Verify Admin Access
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, admin_role')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) return redirect('/')

    // Fetch Logs
    const { data: logs, error } = await supabase
        .from('admin_logs')
        .select(`
            *,
            admin:profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        console.error('Error fetching logs:', error)
    }

    const typedLogs = (logs ?? []) as AdminLogWithAdmin[]

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">Recent actions performed by administrators.</p>

            <Card>
                <CardHeader>
                    <CardTitle>System Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Admin</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {typedLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{log.admin?.full_name || 'Unknown'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="uppercase text-xs">
                                            {log.action.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {log.target_resource}
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground" title={JSON.stringify(log.details, null, 2)}>
                                        {JSON.stringify(log.details)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {typedLogs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No logs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
