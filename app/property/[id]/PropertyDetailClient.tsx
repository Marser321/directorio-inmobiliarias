// @regression-guard-locked: Scrollytelling Property Detail v2.0

'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Home, Share, Heart, Phone, MessageCircle, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AirbnbGallery } from "@/components/luxe/AirbnbGallery";
import { ScrollRevealSection, StickySidebar, FeatureReveal, TextReveal } from "@/components/luxe/ScrollAnimations";
import { InvestmentPotential } from "@/components/luxe/InvestmentPotential";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getOrCreateFunnelSessionId, trackFunnelEvent } from "@/lib/analytics/funnel";
import { useCompare } from "@/hooks/useCompare";
import { CadastreInfoCard } from "@/components/property/CadastreInfoCard";

const LuxeMap = dynamic(() => import("@/components/luxe/LuxeMap"), { ssr: false });

interface PropertyData {
    id: number;
    agencyId: number | null;
    title: string;
    location: string;
    address: string | null;
    city: string | null;
    coordinateSource?: 'manual' | 'geocoded' | 'centroid' | 'none' | 'unknown' | null;
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
    lat: number | null;
    lng: number | null;
}

interface PropertyDetailClientProps {
    property: PropertyData;
}

export default function PropertyDetailClient({ property }: PropertyDetailClientProps) {
    const [leadName, setLeadName] = useState("");
    const [leadPhone, setLeadPhone] = useState("");
    const [leadEmail, setLeadEmail] = useState("");
    const [leadMessage, setLeadMessage] = useState("");
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);
    const [leadFeedback, setLeadFeedback] = useState<string | null>(null);
    const { isInCompare, toggleCompare, compareCount, maxCompareItems } = useCompare();
    const inCompare = isInCompare(property.id);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: property.currency || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    const formattedPrice = useMemo(() => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: property.currency || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(property.price);
    }, [property.currency, property.price]);

    const priceBand = useMemo(() => {
        if (property.price >= 1500000) return "ultra";
        if (property.price >= 800000) return "premium";
        if (property.price >= 300000) return "mid";
        return "entry";
    }, [property.price]);

    const hasWhatsapp = property.agent.whatsapp.trim().length > 0;
    const whatsappHref = useMemo(() => {
        if (!hasWhatsapp) return "";
        const rawNumber = property.agent.whatsapp.replace(/[^\d+]/g, "");
        const message = `Hola! Me interesa la propiedad #${property.id} en ${property.location} (${formattedPrice}).`;
        return `https://wa.me/${rawNumber}?text=${encodeURIComponent(message)}`;
    }, [hasWhatsapp, property.agent.whatsapp, property.id, property.location, formattedPrice]);

    useEffect(() => {
        void trackFunnelEvent("property_viewed", {
            property_id: property.id,
            metadata: {
                location: property.location,
                price: property.price,
                price_band: priceBand,
            },
        });
    }, [property.id, property.location, property.price, priceBand]);

    const handleWhatsappClick = () => {
        void trackFunnelEvent("whatsapp_clicked", {
            property_id: property.id,
            metadata: {
                location: property.location,
                price_band: priceBand,
                source: "property_detail",
            },
        });
    };

    const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!leadName.trim()) {
            setLeadFeedback("Ingresa tu nombre para enviarte información.");
            return;
        }

        setIsSubmittingLead(true);
        setLeadFeedback(null);

        try {
            const response = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    property_id: property.id,
                    name: leadName.trim(),
                    phone: leadPhone.trim() || undefined,
                    email: leadEmail.trim() || undefined,
                    message: leadMessage.trim() || undefined,
                    source: "property_detail",
                    session_id: getOrCreateFunnelSessionId(),
                    page_path: window.location.pathname,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || "No se pudo enviar tu solicitud");
            }

            await trackFunnelEvent("lead_form_submitted", {
                property_id: property.id,
                metadata: {
                    source: "property_detail",
                    price_band: priceBand,
                },
            });

            setLeadFeedback("Solicitud enviada. Te contactaremos a la brevedad.");
            setLeadName("");
            setLeadPhone("");
            setLeadEmail("");
            setLeadMessage("");
        } catch (error) {
            setLeadFeedback(error instanceof Error ? error.message : "No se pudo enviar tu solicitud");
        } finally {
            setIsSubmittingLead(false);
        }
    };

    const scrollToLeadFallback = () => {
        const leadForm = document.getElementById('lead-fallback-form');
        if (!leadForm) return;
        leadForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        <div className="min-h-screen bg-editorial-layer text-foreground">
            {/* FLOATING HEADER */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-4"
            >
                <div className="rounded-full border border-border/50 bg-surface-0/85 px-6 py-3 shadow-sm backdrop-blur-md">
                    <Link href="/" className="font-serif text-xl font-bold tracking-tight text-ink-strong">
                        Luxe<span className="text-accent-gold-soft">Estate</span>
                    </Link>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full border border-border/50 bg-surface-0/80 text-ink-strong backdrop-blur-md hover:bg-surface-1"
                    >
                        <Share className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full border border-border/50 bg-surface-0/80 text-ink-strong backdrop-blur-md hover:bg-surface-1"
                        onClick={() => {
                            if (!inCompare && compareCount >= maxCompareItems) return;
                            toggleCompare(property.id, 'property_detail');
                        }}
                        aria-label="Agregar o quitar propiedad del comparador"
                    >
                        {inCompare ? <Heart className="w-5 h-5 fill-current" /> : <Scale className="w-5 h-5" />}
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
                        <ScrollRevealSection>
                            <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-gold-strong">
                                    Ficha Editorial
                                </p>
                                <h1 className="mt-3 text-3xl font-bold leading-tight text-ink-strong md:text-5xl">
                                    {property.title}
                                </h1>
                                <div className="section-divider-soft my-4" />
                                <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                                    <span className="rounded-full border border-border bg-surface-1/75 px-3 py-1">{property.location}</span>
                                    <span className="rounded-full border border-accent-gold-soft/30 bg-accent-gold-soft/10 px-3 py-1 text-ink-strong">
                                        {property.badge}
                                    </span>
                                    <span className="rounded-full border border-border bg-surface-1/75 px-3 py-1">
                                        {property.bedrooms} dorm · {property.bathrooms} baños
                                    </span>
                                </div>
                            </div>
                        </ScrollRevealSection>

                        {/* Key Stats with Animation */}
                        <ScrollRevealSection>
                            <div className="flex flex-wrap gap-8 rounded-3xl border border-border/70 bg-card/70 px-6 py-8">
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
                                        <div className="rounded-2xl bg-surface-1 p-4 text-accent-gold-soft">
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
                                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink-strong">
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
                            <InvestmentPotential locationQuery={property.location} />
                        </ScrollRevealSection>

                        {/* Amenities with Feature Reveal */}
                        <ScrollRevealSection delay={0.2}>
                            <div>
                                <h3 className="mb-8 text-2xl font-serif font-bold text-ink-strong">Amenidades</h3>
                                <FeatureReveal features={amenities} />
                            </div>
                        </ScrollRevealSection>

                        {/* Property Details Grid */}
                        <ScrollRevealSection delay={0.3}>
                            <div className="rounded-2xl border border-border/70 bg-card/80 p-8">
                                <h3 className="mb-6 text-2xl font-serif font-bold text-ink-strong">Detalles de la Propiedad</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    {[
                                        { label: 'Área del Terreno', value: `${property.plotArea} m²` },
                                        { label: 'Área Construida', value: `${property.builtArea} m²` },
                                        { label: 'Dormitorios', value: property.bedrooms },
                                        { label: 'Baños', value: property.bathrooms },
                                    ].map((detail) => (
                                        <div key={detail.label}>
                                            <p className="text-sm text-ink-soft">{detail.label}</p>
                                            <p className="text-lg font-bold text-ink-strong">{detail.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ScrollRevealSection>

                        {/* Location Map */}
                        <ScrollRevealSection delay={0.4}>
                            <h3 className="mb-6 text-2xl font-serif font-bold text-ink-strong">Ubicación</h3>
                            <div className="h-[400px] overflow-hidden rounded-2xl border border-border/80 bg-surface-1 shadow-lg">
                                <LuxeMap
                                    properties={[{ ...property, id: property.id }]}
                                    hoveredPropertyId={null}
                                />
                            </div>
                        </ScrollRevealSection>

                        <ScrollRevealSection delay={0.45}>
                            <CadastreInfoCard
                                propertyId={property.id}
                                agencyId={property.agencyId}
                                address={property.address}
                                city={property.city}
                                lat={property.lat}
                                lng={property.lng}
                                coordinateSource={property.coordinateSource || null}
                            />
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
                                className="rounded-3xl border border-border/80 bg-card/90 p-8 shadow-2xl backdrop-blur-sm"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <p className="text-sm font-medium uppercase tracking-wider text-ink-soft">
                                            Precio de Venta
                                        </p>
                                        <h2 className="mt-2 text-4xl font-serif font-bold text-ink-strong md:text-5xl">
                                            {formatPrice(property.price)}
                                        </h2>
                                    </div>
                                    <Badge variant="gold" className="text-sm">
                                        {property.badge}
                                    </Badge>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        className="h-12 w-full rounded-xl border-border text-base font-semibold text-ink-strong hover:border-accent-gold-soft"
                                        onClick={() => {
                                            if (!inCompare && compareCount >= maxCompareItems) return;
                                            toggleCompare(property.id, 'property_detail');
                                        }}
                                        aria-label="Agregar o quitar propiedad del comparador"
                                    >
                                        <Scale className="w-4 h-4 mr-2" />
                                        {inCompare ? 'Quitar de comparador' : 'Agregar a comparador'}
                                    </Button>
                                    <Button className="h-14 w-full rounded-xl bg-accent-gold-soft text-lg font-semibold text-surface-0 hover:bg-accent-gold-strong">
                                        <Phone className="w-5 h-5 mr-2" />
                                        Agendar Visita
                                    </Button>
                                    {hasWhatsapp ? (
                                        <Button
                                            variant="outline"
                                            className="w-full h-14 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-xl text-lg font-semibold"
                                            asChild
                                        >
                                            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={handleWhatsappClick}>
                                                <MessageCircle className="w-5 h-5 mr-2" />
                                                WhatsApp
                                            </a>
                                        </Button>
                                    ) : (
                                        <form id="lead-fallback-form" className="space-y-2 border border-border rounded-xl p-3" onSubmit={handleLeadSubmit}>
                                            <p className="text-xs text-muted-foreground">
                                                Esta propiedad no tiene WhatsApp disponible. Déjanos tus datos y te contactamos.
                                            </p>
                                            <Input
                                                placeholder="Nombre"
                                                value={leadName}
                                                onChange={(e) => setLeadName(e.target.value)}
                                                required
                                            />
                                            <Input
                                                placeholder="Teléfono (opcional)"
                                                value={leadPhone}
                                                onChange={(e) => setLeadPhone(e.target.value)}
                                            />
                                            <Input
                                                placeholder="Email (opcional)"
                                                type="email"
                                                value={leadEmail}
                                                onChange={(e) => setLeadEmail(e.target.value)}
                                            />
                                            <Textarea
                                                placeholder="Mensaje (opcional)"
                                                value={leadMessage}
                                                onChange={(e) => setLeadMessage(e.target.value)}
                                                className="min-h-20"
                                            />
                                            <Button
                                            type="submit"
                                                className="w-full bg-ink-strong text-surface-0 hover:bg-ink-strong/90"
                                                disabled={isSubmittingLead}
                                            >
                                                {isSubmittingLead ? "Enviando..." : "Enviar consulta"}
                                            </Button>
                                            {leadFeedback ? (
                                                <p className="text-xs text-muted-foreground">{leadFeedback}</p>
                                            ) : null}
                                        </form>
                                    )}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.65 }}
                                className="mt-4 rounded-2xl border border-border/80 bg-surface-1/75 p-5"
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-gold-strong">
                                    Señales de decisión
                                </p>
                                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-2">
                                    <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2">
                                        Comparador: <span className="font-semibold text-ink-strong">{compareCount}/4 seleccionadas</span>
                                    </div>
                                    <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2">
                                        Banda de precio: <span className="font-semibold uppercase text-ink-strong">{priceBand}</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Agent Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="mt-4 flex items-center gap-5 rounded-2xl border border-border/70 bg-card/80 p-6"
                            >
                                <div className="h-20 w-20 overflow-hidden rounded-full bg-muted-foreground/20 ring-2 ring-accent-gold-soft ring-offset-2 ring-offset-surface-0">
                                    <Image
                                        src={property.agent.avatar}
                                        alt={property.agent.name}
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-cover"
                                    />

                                </div>
                                <div>
                                    <p className="text-sm font-medium text-ink-soft">Tu asesor</p>
                                    <h4 className="text-xl font-bold text-ink-strong">{property.agent.name}</h4>
                                    <p className="font-medium text-accent-gold-strong">{property.agent.title}</p>
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
                className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-0/92 p-4 pb-8 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:hidden"
            >
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Precio</p>
                        <p className="text-2xl font-serif font-bold text-foreground">{formatPrice(property.price)}</p>
                    </div>
                    {hasWhatsapp ? (
                        <Button
                            size="lg"
                            className="rounded-xl bg-accent-gold-soft text-surface-0 shadow-lg shadow-accent-gold-soft/20 hover:bg-accent-gold-strong"
                            asChild
                        >
                            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={handleWhatsappClick}>
                                <MessageCircle className="w-5 h-5 mr-2" />
                                WhatsApp
                            </a>
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                            onClick={scrollToLeadFallback}
                        >
                            <Phone className="w-5 h-5 mr-2" />
                            Enviar consulta
                        </Button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
