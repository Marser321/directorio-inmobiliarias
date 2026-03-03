'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'

interface FilterOption {
    value: string
    label: string
}

interface SearchFiltersProps {
    searchPlaceholder?: string
    filterOptions?: {
        name: string
        label: string
        options: FilterOption[]
    }[]
}

export function SearchFilters({
    searchPlaceholder = 'Buscar...',
    filterOptions = []
}: SearchFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')

    const createQueryString = useCallback(
        (params: Record<string, string | null>) => {
            const current = new URLSearchParams(Array.from(searchParams.entries()))

            Object.entries(params).forEach(([key, value]) => {
                if (value === null || value === '') {
                    current.delete(key)
                } else {
                    current.set(key, value)
                }
            })

            return current.toString()
        },
        [searchParams]
    )

    const handleSearch = (value: string) => {
        setSearchValue(value)
        startTransition(() => {
            const qs = createQueryString({ search: value || null })
            router.push(`${pathname}${qs ? `?${qs}` : ''}`)
        })
    }

    const handleFilterChange = (name: string, value: string) => {
        startTransition(() => {
            const qs = createQueryString({ [name]: value === 'all' ? null : value })
            router.push(`${pathname}${qs ? `?${qs}` : ''}`)
        })
    }

    const clearFilters = () => {
        setSearchValue('')
        startTransition(() => {
            router.push(pathname)
        })
    }

    const hasFilters = searchValue || filterOptions.some(f => searchParams.has(f.name))

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-xl border shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1 w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 w-full"
                />
            </div>

            {/* Filter Selects */}
            {filterOptions.map((filter) => (
                <Select
                    key={filter.name}
                    value={searchParams.get(filter.name) || 'all'}
                    onValueChange={(v) => handleFilterChange(filter.name, v)}
                >
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {filter.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ))}

            {/* Clear Filters */}
            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-slate-500"
                >
                    <X className="w-4 h-4 mr-1" />
                    Limpiar
                </Button>
            )}

            {/* Loading indicator */}
            {isPending && (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            )}
        </div>
    )
}
