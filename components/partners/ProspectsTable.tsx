'use client'

import { useMemo, useState } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
} from '@tanstack/react-table'
import {
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    MapPin,
    MessageSquare,
    ExternalLink,
    CheckCircle,
    XCircle
} from 'lucide-react'

// Prospect type
export interface ProspectRow {
    id: string
    address: string
    owner_name: string
    listed_price: number
    market_estimate: number
    source: 'google_maps' | 'mercadolibre' | 'facebook'
    status: 'new' | 'qualified' | 'contacted' | 'converted' | 'disqualified'
    quality_score: number
    days_on_market: number
    last_contact: string | null // ISO date
}

interface ProspectsTableProps {
    prospects: ProspectRow[]
    onAction: (id: string, action: string) => void
}

const columnHelper = createColumnHelper<ProspectRow>()

// Status badge component
function StatusBadge({ status }: { status: ProspectRow['status'] }) {
    const statusConfig = {
        new: { label: 'Nuevo', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
        qualified: { label: 'Calificado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
        contacted: { label: 'Contactado', color: 'bg-amber-500/10 text-amber-600 border-amber-500/25' },
        converted: { label: 'Ganado', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
        disqualified: { label: 'Descartado', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    }
    const config = statusConfig[status] || statusConfig['new']

    return (
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
            {config.label}
        </span>
    )
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(price)
}

export function ProspectsTable({ prospects, onAction }: ProspectsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    const columns = useMemo(() => [
        columnHelper.accessor('quality_score', {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-gold transition-colors"
                    onClick={() => column.toggleSorting()}
                >
                    Score
                    <SortIcon isSorted={column.getIsSorted()} />
                </button>
            ),
            cell: (info) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-xs font-bold">
                        {info.getValue()}
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor('address', {
            header: 'Propiedad',
            cell: (info) => (
                <div>
                    <p className="font-medium text-foreground line-clamp-1">
                        {info.getValue()}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{info.row.original.source}</span>
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor('listed_price', {
            header: 'Precio Lista',
            cell: (info) => (
                <span className="text-foreground">
                    {formatPrice(info.getValue())}
                </span>
            ),
        }),
        columnHelper.accessor('market_estimate', {
            header: 'Est. Mercado',
            cell: (info) => (
                <span className="text-muted-foreground text-sm">
                    {formatPrice(info.getValue())}
                </span>
            ),
        }),
        columnHelper.accessor('status', {
            header: 'Estado',
            cell: (info) => <StatusBadge status={info.getValue()} />,
        }),
        columnHelper.display({
            id: 'actions',
            header: '',
            cell: (info) => (
                <div className="flex gap-2 justify-end">
                    {info.row.original.status === 'new' && (
                        <>
                            <button
                                onClick={() => onAction(info.row.original.id, 'approve')}
                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                                title="Aprobar (Calificar)"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onAction(info.row.original.id, 'reject')}
                                className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all"
                                title="Rechazar (Descartar)"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    {info.row.original.status === 'qualified' && (
                        <button
                            onClick={() => onAction(info.row.original.id, 'contact')}
                            className="p-2 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-all"
                            title="Marcar como contactado"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                    )}
                    {info.row.original.status === 'contacted' && (
                        <>
                            <button
                                onClick={() => onAction(info.row.original.id, 'convert')}
                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                                title="Marcar como convertido"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onAction(info.row.original.id, 'reject')}
                                className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all"
                                title="Descartar lead"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    <div className="w-px h-6 bg-border/50 mx-1" />
                    <button
                        onClick={() => onAction(info.row.original.id, 'view')}
                        className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        title="Ver detalles"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onAction(info.row.original.id, 'outreach')}
                        className="p-2 rounded-lg bg-accent-gold-soft/15 text-accent-gold-strong hover:bg-accent-gold-soft/25 transition-all"
                        title="Iniciar contacto"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                </div>
            ),
        }),
    ], [onAction])

    // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table hook is expected here.
    const table = useReactTable({
        data: prospects,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })

    return (
        <div>
            {/* Search */}
            <div className="p-4 border-b border-border/50">
                <input
                    type="text"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar leads..."
                    className="w-full max-w-sm px-4 py-2 rounded-lg border border-border bg-background focus:border-accent-gold-soft/45 focus:ring-1 focus:ring-accent-gold-soft/35 outline-none transition-all text-sm"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="border-b border-border/50">
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )
                                        }
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {table.getRowModel().rows.map(row => (
                            <tr
                                key={row.id}
                                className="hover:bg-muted/30 transition-colors"
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-4 py-3">
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination info */}
            <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                    Mostrando {table.getRowModel().rows.length} de {prospects.length} leads
                </span>
            </div>
        </div>
    )
}

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
    if (isSorted === 'asc') return <ChevronUp className="w-4 h-4" />
    if (isSorted === 'desc') return <ChevronDown className="w-4 h-4" />
    return <ArrowUpDown className="w-3 h-3 opacity-50" />
}
