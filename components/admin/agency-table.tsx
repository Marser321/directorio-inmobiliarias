'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { Pencil, ExternalLink, MoreHorizontal } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AgencyTableProps {
    agencies: any[]
}

export function AgencyTable({ agencies }: AgencyTableProps) {
    return (
        <div className="rounded-md border bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Logo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Creada</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {agencies.map((agency) => (
                        <TableRow key={agency.id}>
                            <TableCell>
                                {agency.logo_url ? (
                                    <img
                                        src={agency.logo_url}
                                        alt={agency.name}
                                        className="w-10 h-10 object-contain rounded-md bg-slate-50 border"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400">
                                        N/A
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="font-medium">{agency.name}</TableCell>
                            <TableCell className="text-slate-500">{agency.slug}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">
                                    {agency.tier_subscription || 'basic'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge
                                    className={
                                        agency.is_verified
                                            ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20'
                                            : 'bg-slate-100 text-slate-700'
                                    }
                                >
                                    {agency.is_verified ? 'Verificada' : 'Sin verificar'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                                {format(new Date(agency.created_at), 'PPP', { locale: es })}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href={`/admin/agencies/${agency.id}/edit`}>
                                                <Pencil className="w-4 h-4 mr-2" />
                                                Editar
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/agencies/${agency.slug}`} target="_blank">
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                Ver Página Pública
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                    {agencies.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No hay inmobiliarias registradas.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
