'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    PaginationState,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
    Star,
    Edit,
    Eye,
    Bed,
    Bath,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
} from 'lucide-react'

// Property type for the table
export interface PropertyRow {
    id: number
    title: string
    slug: string
    main_image: string | null
    price: number
    currency: 'USD' | 'UYU'
    status: 'for_sale' | 'for_rent' | 'sold' | 'rented'
    is_featured: boolean
    bedrooms: number | null
    bathrooms: number | null
    view_count: number
}

interface PropertiesTableProps {
    properties: PropertyRow[]
    onToggleFeatured: (id: number) => void
    onEdit: (id: number) => void
}

const columnHelper = createColumnHelper<PropertyRow>()

// Status badge component
function StatusBadge({ status }: { status: PropertyRow['status'] }) {
    const statusConfig = {
        for_sale: { label: 'En Venta', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
        for_rent: { label: 'En Alquiler', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
        sold: { label: 'Vendida', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
        rented: { label: 'Alquilada', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    }
    const config = statusConfig[status]

    return (
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
            {config.label}
        </span>
    )
}

// Price formatter
function formatPrice(price: number, currency: 'USD' | 'UYU'): string {
    return new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(price)
}

export function PropertiesTable({ properties, onToggleFeatured, onEdit }: PropertiesTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

    const columns = useMemo(() => [
        columnHelper.accessor('main_image', {
            header: '',
            cell: (info) => (
                <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-muted">
                    {info.getValue() ? (
                        <Image
                            src={info.getValue()!}
                            alt=""
                            fill
                            unoptimized
                            sizes="64px"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            🏠
                        </div>
                    )}
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('title', {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-gold transition-colors"
                    onClick={() => column.toggleSorting()}
                >
                    Propiedad
                    <SortIcon isSorted={column.getIsSorted()} />
                </button>
            ),
            cell: (info) => (
                <div>
                    <p className="font-medium text-foreground line-clamp-1">
                        {info.getValue()}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {info.row.original.bedrooms && (
                            <span className="flex items-center gap-1">
                                <Bed className="w-3 h-3" />
                                {info.row.original.bedrooms}
                            </span>
                        )}
                        {info.row.original.bathrooms && (
                            <span className="flex items-center gap-1">
                                <Bath className="w-3 h-3" />
                                {info.row.original.bathrooms}
                            </span>
                        )}
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor('price', {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-gold transition-colors"
                    onClick={() => column.toggleSorting()}
                >
                    Precio
                    <SortIcon isSorted={column.getIsSorted()} />
                </button>
            ),
            cell: (info) => (
                <span className="font-medium text-foreground">
                    {formatPrice(info.getValue(), info.row.original.currency)}
                </span>
            ),
        }),
        columnHelper.accessor('status', {
            header: 'Estado',
            cell: (info) => <StatusBadge status={info.getValue()} />,
        }),
        columnHelper.accessor('view_count', {
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 hover:text-gold transition-colors"
                    onClick={() => column.toggleSorting()}
                >
                    <Eye className="w-4 h-4" />
                    Vistas
                    <SortIcon isSorted={column.getIsSorted()} />
                </button>
            ),
            cell: (info) => (
                <span className="text-muted-foreground">
                    {info.getValue().toLocaleString()}
                </span>
            ),
        }),
        columnHelper.accessor('is_featured', {
            header: 'Destacar',
            cell: (info) => (
                <button
                    onClick={() => onToggleFeatured(info.row.original.id)}
                    className={`p-2 rounded-lg transition-all ${info.getValue()
                            ? 'bg-gold/10 text-gold hover:bg-gold/20'
                            : 'bg-muted/50 text-muted-foreground hover:text-gold hover:bg-muted'
                        }`}
                    title={info.getValue() ? 'Quitar destacado' : 'Destacar propiedad'}
                >
                    <Star className={`w-4 h-4 ${info.getValue() ? 'fill-current' : ''}`} />
                </button>
            ),
        }),
        columnHelper.display({
            id: 'actions',
            header: '',
            cell: (info) => (
                <button
                    onClick={() => onEdit(info.row.original.id)}
                    className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    title="Editar propiedad"
                >
                    <Edit className="w-4 h-4" />
                </button>
            ),
        }),
    ], [onToggleFeatured, onEdit])

    // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table hook is expected here.
    const table = useReactTable({
        data: properties,
        columns,
        state: {
            sorting,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    })

    const filteredCount = table.getFilteredRowModel().rows.length
    const startRow = filteredCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
    const endRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredCount)

    return (
        <div>
            {/* Search */}
            <div className="p-4 border-b border-border/50">
                <input
                    type="text"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Buscar propiedades..."
                    className="w-full max-w-sm px-4 py-2 rounded-lg border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all text-sm"
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

            {/* Empty state */}
            {properties.length === 0 && (
                <div className="py-12 text-center">
                    <p className="text-muted-foreground">No tienes propiedades aún</p>
                    <button className="mt-4 text-gold hover:underline">
                        Agregar primera propiedad
                    </button>
                </div>
            )}

            {/* Pagination info */}
            <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                    Mostrando {startRow}-{endRow} de {filteredCount} propiedades
                </span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>
                    <span className="text-xs">
                        Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
                    </span>
                    <button
                        type="button"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    )
}

// Sort icon helper
function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
    if (isSorted === 'asc') return <ChevronUp className="w-4 h-4" />
    if (isSorted === 'desc') return <ChevronDown className="w-4 h-4" />
    return <ArrowUpDown className="w-3 h-3 opacity-50" />
}
