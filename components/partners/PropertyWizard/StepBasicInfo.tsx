'use client'

import { motion } from 'framer-motion'
import { UseFormReturn } from 'react-hook-form'
import { DollarSign, Tag, Home, Building2, Map, Store } from 'lucide-react'
import { BasicInfoData, PROPERTY_TYPES } from './schemas'

interface StepBasicInfoProps {
    form: UseFormReturn<BasicInfoData>
}

export function StepBasicInfo({ form }: StepBasicInfoProps) {
    const { register, formState: { errors }, watch, setValue } = form
    const selectedType = watch('property_type')
    const titleLength = watch('title')?.length || 0

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Título de la Propiedad *
                </label>
                <input
                    {...register('title')}
                    type="text"
                    placeholder="Ej: Espectacular Villa con Vista al Mar en La Barra"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                />
                <div className="flex justify-between mt-1">
                    {errors.title ? (
                        <span className="text-xs text-red-400">{errors.title.message}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">Un título atractivo mejora la visibilidad</span>
                    )}
                    <span className={`text-xs ${titleLength > 80 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {titleLength}/100
                    </span>
                </div>
            </div>

            {/* Property Type */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                    Tipo de Propiedad *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PROPERTY_TYPES.map((type) => {
                        const isSelected = selectedType === type.value
                        const Icon = type.value === 'house' ? Home
                            : type.value === 'apartment' ? Building2
                                : type.value === 'land' ? Map
                                    : Store

                        return (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setValue('property_type', type.value, { shouldValidate: true })}
                                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected
                                        ? 'border-gold bg-gold/10 text-gold'
                                        : 'border-border hover:border-gold/50 text-muted-foreground hover:text-foreground'
                                    }
                `}
                            >
                                <Icon className="w-6 h-6 mx-auto mb-2" />
                                <span className="text-sm font-medium">{type.label}</span>
                                {isSelected && (
                                    <motion.div
                                        layoutId="selectedType"
                                        className="absolute inset-0 border-2 border-gold rounded-xl"
                                        transition={{ type: 'spring', bounce: 0.2 }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
                {errors.property_type && (
                    <span className="text-xs text-red-400 mt-1 block">{errors.property_type.message}</span>
                )}
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Price */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Precio *
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            {...register('price', { valueAsNumber: true })}
                            type="number"
                            placeholder="850000"
                            min={0}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                        />
                    </div>
                    {errors.price && (
                        <span className="text-xs text-red-400 mt-1 block">{errors.price.message}</span>
                    )}
                </div>

                {/* Currency */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Moneda
                    </label>
                    <select
                        {...register('currency')}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                    >
                        <option value="USD">USD</option>
                        <option value="UYU">UYU</option>
                    </select>
                </div>
            </div>

            {/* Status */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                    Estado *
                </label>
                <div className="flex gap-4">
                    {[
                        { value: 'for_sale', label: 'En Venta', color: 'emerald' },
                        { value: 'for_rent', label: 'En Alquiler', color: 'sky' },
                    ].map((status) => (
                        <label
                            key={status.value}
                            className={`
                flex items-center gap-3 px-5 py-3 rounded-xl border-2 cursor-pointer transition-all
                ${watch('status') === status.value
                                    ? status.value === 'for_sale'
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                        : 'border-sky-500 bg-sky-500/10 text-sky-400'
                                    : 'border-border hover:border-muted-foreground text-muted-foreground'
                                }
              `}
                        >
                            <input
                                type="radio"
                                {...register('status')}
                                value={status.value}
                                className="sr-only"
                            />
                            <Tag className="w-4 h-4" />
                            {status.label}
                        </label>
                    ))}
                </div>
                {errors.status && (
                    <span className="text-xs text-red-400 mt-1 block">{errors.status.message}</span>
                )}
            </div>
        </motion.div>
    )
}
