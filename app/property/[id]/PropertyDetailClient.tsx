// @regression-guard-locked: Scrollytelling Property Detail v2.0

'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Home, Share, Heart, Phone, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { AirbnbGallery } from "@/components/luxe/AirbnbGallery";
import { ParallaxGallery } from "@/components/luxe/ParallaxGallery";
import { ScrollRevealSection, StickySidebar, FeatureReveal, TextReveal } from "@/components/luxe/ScrollAnimations";
import { InvestmentPotential } from "@/components/luxe/InvestmentPotential";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

const LuxeMap = dynamic(() => import("@/components/luxe/LuxeMap"), { ssr: false });

interface PropertyData {
    id: number;
    title: string;
    location: string;
    badge: string;
    price: number;
    currency: string;
    bedrooms: number;
    bathrooms: number;
    builtArea: number;
    plotArea: number;
    description: string[];
    amenities: string[];
    images: { src: string; alt: string }[];
    agent: {
        name: string;
        title: string;
        phone: string;
        whatsapp: string;
        avatar: string;
    };
}

interface PropertyDetailClientProps {
    property: PropertyData;
}

export default function PropertyDetailClient({ property }: PropertyDetailClientProps) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: property.currency || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    // Default images if none provided
    const images = property.images.length > 0 ? property.images : [
        { src: '/images/placeholders/luxury-villa.jpg', alt: 'Vista Principal' },
    ];

    // Default amenities if none provided
    const amenities = property.amenities.length > 0 ? property.amenities : [
        'Consultar Amenidades'
    ];

    return (
        <div className="bg-background min-h-screen text-foreground">
            {/* FLOATING HEADER */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-4"
            >
                <div className="backdrop-blur-md bg-black/30 rounded-full px-6 py-3">
                    <Link href="/" className="font-serif font-bold text-xl tracking-tight text-white">
                        Luxe<span className="text-[#D4AF37]">Estate</span>
                    </Link>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white rounded-full"
                    >
                        <Share className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white rounded-full"
                    >
                        <Heart className="w-5 h-5" />
                    </Button>
                </div>
            </motion.nav>

            {/* GALLERY - Airbnb-style 1+4 grid */}
            <div className="container mx-auto px-6 pt-24 pb-8">
                <AirbnbGallery images={images} title={property.title} />
            </div>

            {/* MAIN CONTENT */}
            <div className="container mx-auto px-6 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* LEFT COLUMN - Details */}
                    <div className="lg:col-span-7 space-y-16">

                        {/* Key Stats with Animation */}
                        <ScrollRevealSection>
                            <div className="flex flex-wrap gap-8 py-8 border-b border-border">
                                {[
                                    { icon: Bed, label: 'Dormitorios', value: `${property.bedrooms} Suites` },
                                    { icon: Bath, label: 'Baños', value: `${property.bathrooms} Completos` },
                                    { icon: Home, label: 'Área Construida', value: `${property.builtArea} m²` },
                                ].map((stat, index) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center gap-4"
                                    >
                                        <div className="p-4 bg-muted rounded-2xl text-[#D4AF37]">
                                            <stat.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                                            <p className="text-lg font-bold">{stat.value}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </ScrollRevealSection>

                        {/* Description with Text Reveal */}
                        {property.description.length > 0 && (
                            <ScrollRevealSection delay={0.1}>
                                <div className="space-y-6">
                                    <h2 className="text-3xl md:text-4xl font-serif font-bold">
                                        Descripción
                                    </h2>
                                    {property.description.map((paragraph, index) => (
                                        <TextReveal
                                            key={index}
                                            text={paragraph}
                                            className="text-muted-foreground leading-relaxed text-lg"
                                        />
                                    ))}
                                </div>
                            </ScrollRevealSection>
                        )}

                        {/* Investment Potential Section */}
                        <ScrollRevealSection delay={0.15}>
                            <InvestmentPotential />
                        </ScrollRevealSection>

                        {/* Amenities with Feature Reveal */}
                        <ScrollRevealSection delay={0.2}>
                            <div>
                                <h3 className="text-2xl font-serif font-bold mb-8">Amenidades</h3>
                                <FeatureReveal features={amenities} />
                            </div>
                        </ScrollRevealSection>

                        {/* Property Details Grid */}
                        <ScrollRevealSection delay={0.3}>
                            <div className="bg-muted/50 rounded-2xl p-8">
                                <h3 className="text-2xl font-serif font-bold mb-6">Detalles de la Propiedad</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    {[
                                        { label: 'Área del Terreno', value: `${property.plotArea} m²` },
                                        { label: 'Área Construida', value: `${property.builtArea} m²` },
                                        { label: 'Dormitorios', value: property.bedrooms },
                                        { label: 'Baños', value: property.bathrooms },
                                    ].map((detail) => (
                                        <div key={detail.label}>
                                            <p className="text-sm text-muted-foreground">{detail.label}</p>
                                            <p className="font-bold text-lg">{detail.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollRevealSection>

                        {/* Location Map */}
                        <ScrollRevealSection delay={0.4}>
                            <h3 className="text-2xl font-serif font-bold mb-6">Ubicación</h3>
                            <div className="h-[400px] rounded-2xl overflow-hidden border border-border shadow-lg">
                                <LuxeMap
                                    properties={[{ ...property, id: property.id }]}
                                    hoveredPropertyId={null}
                                />
                            </div>
                        </ScrollRevealSection>

                    </div>

                    {/* RIGHT COLUMN - Sticky Sidebar */}
                    <div className="lg:col-span-5">
                        <StickySidebar topOffset={100}>

                            {/* Price Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="p-8 rounded-3xl border border-border shadow-2xl bg-card"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                                            Precio de Venta
                                        </p>
                                        <h2 className="text-4xl md:text-5xl font-serif font-bold mt-2">
                                            {formatPrice(property.price)}
                                        </h2>
                                    </div>
                                    <Badge variant="gold" className="text-sm">
                                        {property.badge}
                                    </Badge>
                                </div>

                                <div className="space-y-3">
                                    <Button className="w-full bg-[#D4AF37] hover:bg-[#B8942F] text-white h-14 text-lg font-semibold rounded-xl">
                                        <Phone className="w-5 h-5 mr-2" />
                                        Agendar Visita
                                    </Button>
                                    {property.agent.whatsapp && (
                                        <Button
                                            variant="outline"
                                            className="w-full h-14 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-xl text-lg font-semibold"
                                            asChild
                                        >
                                            <a href={`https://wa.me/${property.agent.whatsapp}?text=Hola! Me interesa la propiedad ${property.title}`} target="_blank" rel="noopener noreferrer">
                                                <MessageCircle className="w-5 h-5 mr-2" />
                                                WhatsApp
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </motion.div>

                            {/* Agent Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="bg-muted rounded-2xl p-6 flex items-center gap-5"
                            >
                                <div className="w-20 h-20 bg-muted-foreground/20 rounded-full overflow-hidden ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-background">
                                    <Image
                                        src={property.agent.avatar}
                                        alt={property.agent.name}
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-cover"
                                    />

                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Tu asesor</p>
                                    <h4 className="font-bold text-xl">{property.agent.name}</h4>
                                    <p className="text-[#D4AF37] font-medium">{property.agent.title}</p>
                                </div>
                            </motion.div>

                        </StickySidebar>
                    </div>

                </div>
            </div>

            {/* BACK TO TOP / FOOTER SPACER */}
            <div className="h-32 lg:h-12" />

            {/* MOBILE STICKY CTA BAR */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 1 }}
                className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border p-4 pb-8 z-50 lg:hidden shadow-[0_-5px_20px_rgba(0,0,0,0.1)]"
            >
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Precio</p>
                        <p className="text-2xl font-serif font-bold text-foreground">{formatPrice(property.price)}</p>
                    </div>
                    {property.agent.whatsapp && (
                        <Button
                            size="lg"
                            className="bg-[#D4AF37] hover:bg-[#B8942F] text-white rounded-xl shadow-lg shadow-[#D4AF37]/20"
                            asChild
                        >
                            <a href={`https://wa.me/${property.agent.whatsapp}?text=Hola! Me interesa la propiedad ${property.title}`} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-5 h-5 mr-2" />
                                WhatsApp
                            </a>
                        </Button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
