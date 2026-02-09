'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface LifestyleCategory {
    title: string;
    slug: string;
    image: string;
    propertyCount?: number;
}

const defaultCategories: LifestyleCategory[] = [
    {
        title: "Frente al Mar",
        slug: "beachfront",
        image: "/images/placeholders/beach-house.jpg",
        propertyCount: 24
    },
    {
        title: "Golf & Country",
        slug: "golf",
        image: "/images/placeholders/golf-estate.jpg",
        propertyCount: 18
    },
    {
        title: "Urban Luxury",
        slug: "urban",
        image: "/images/placeholders/urban-penthouse.jpg",
        propertyCount: 32
    },
    {
        title: "Chacras & Campo",
        slug: "farm",
        image: "/images/placeholders/farm-ranch.jpg",
        propertyCount: 15
    }
];

interface LifestyleCategoriesProps {
    categories?: LifestyleCategory[];
}

export function LifestyleCategories({ categories = defaultCategories }: LifestyleCategoriesProps) {
    return (
        <section className="py-24 bg-muted/30">
            <div className="container mx-auto px-6">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-2xl mx-auto mb-16"
                >
                    <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Estilos de Vida
                    </h2>
                    <div className="h-1 w-20 bg-gradient-to-r from-[#D4AF37] to-[#E8D48A] rounded-full mx-auto mb-6" />
                    <p className="text-muted-foreground text-lg">
                        Explora colecciones curadas según tu forma de vivir
                    </p>
                </motion.div>

                {/* Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categories.map((category, index) => (
                        <motion.div
                            key={category.slug}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                        >
                            <Link href={`/lifestyle/${category.slug}`}>
                                <article className="group relative h-[400px] rounded-2xl overflow-hidden cursor-pointer">
                                    {/* Background Image */}
                                    <div className="absolute inset-0">
                                        <img
                                            src={category.image}
                                            alt={category.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    </div>

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                    {/* Content */}
                                    <div className="absolute bottom-0 left-0 right-0 p-6">
                                        <h3 className="font-serif text-2xl font-bold text-white mb-2">
                                            {category.title}
                                        </h3>

                                        {category.propertyCount && (
                                            <p className="text-white/70 text-sm mb-4 italic">
                                                Colección Exclusiva
                                            </p>
                                        )}

                                        {/* Hover Arrow */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                            <span className="text-[#D4AF37] font-medium text-sm uppercase tracking-wider">
                                                Explorar
                                            </span>
                                            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                                        </div>
                                    </div>

                                    {/* Gold border on hover */}
                                    <div className="absolute inset-0 border-2 border-[#D4AF37] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </article>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
