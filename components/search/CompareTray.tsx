'use client';

import Link from 'next/link';
import { Scale, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompare } from '@/hooks/useCompare';
import { useAuth } from '@/hooks/useAuth';
import { trackFunnelEvent } from '@/lib/analytics/funnel';

export function CompareTray() {
    const { featureFlags } = useAuth();
    const { compareCount, clearCompare, compareUrl } = useCompare();

    if (!featureFlags.compare || compareCount === 0) return null;

    const hasMinimum = compareCount >= 2;

    return (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card/90 px-2 py-2 shadow-2xl backdrop-blur">
                <div className="rounded-full bg-ink-strong px-3 py-1 text-xs font-semibold text-surface-0">
                    Comparar ({compareCount})
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Limpiar comparador"
                    className="h-9 w-9 rounded-full text-ink-soft hover:bg-surface-1 hover:text-ink-strong"
                    onClick={clearCompare}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>

                <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-accent-gold-soft px-4 text-surface-0 hover:bg-accent-gold-strong disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!hasMinimum}
                >
                    <Link
                        href={hasMinimum ? compareUrl : '#'}
                        aria-label="Abrir comparador de propiedades"
                        onClick={() => {
                            if (!hasMinimum) return;
                            void trackFunnelEvent('compare_opened', {
                                metadata: {
                                    selected_properties: compareCount,
                                },
                            });
                        }}
                    >
                        <Scale className="mr-2 h-4 w-4" />
                        Ver comparador
                    </Link>
                </Button>
            </div>
        </div>
    );
}
