"use client"

import { Button } from "@/components/ui/button"
import { LIFESTYLES } from "@/constants/lifestyles"
import { cn } from "@/lib/utils"
import { useLifestyleFilter } from "@/hooks/use-lifestyle-filter"

interface LifestyleFilterProps {
    className?: string
}

export function LifestyleFilter({ className }: LifestyleFilterProps) {
    const { selectedStyles, toggleStyle } = useLifestyleFilter()

    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            {LIFESTYLES.map((style) => {
                const isSelected = selectedStyles.includes(style.id)
                const Icon = style.icon

                return (
                    <Button
                        key={style.id}
                        variant="outline"
                        onClick={() => toggleStyle(style.id)}
                        className={cn(
                            "rounded-full border transition-all duration-300 flex items-center gap-2 h-9 px-4 text-sm font-medium",
                            isSelected
                                ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105"
                                : "bg-white text-slate-600 border-slate-200 hover:border-[#C6A665] hover:text-[#C6A665] hover:bg-white"
                        )}
                    >
                        <Icon className={cn("w-4 h-4", isSelected ? "text-white" : style.color)} />
                        {style.label}
                    </Button>
                )
            })}
        </div>
    )
}
