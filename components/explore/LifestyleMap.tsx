'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { MapPin, Waves, TreePine, Moon, Home, Activity } from 'lucide-react';

// Lazy load del mapa para evitar SSR issues con Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Tipos
interface VibeFilter {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  zones: string[];
  description: string;
}

interface Property {
  id: number;
  title: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  location: [number, number]; // [lat, lng]
  lifestyle_tags: string[];
  main_image: string;
  slug: string;
}

interface Zone {
  id: string;
  name: string;
  center: [number, number];
  vibes: string[];
  winterServices: number; // Cantidad de servicios abiertos en invierno
}

// Datos de Vibes disponibles
const VIBE_FILTERS: VibeFilter[] = [
  {
    id: 'nightlife',
    name: 'Vida Nocturna',
    icon: <Moon className="w-5 h-5" />,
    color: 'var(--color-vibe-nightlife)',
    zones: ['la-barra', 'punta-centro', 'manantiales'],
    description: 'Restaurantes, bares y vida social activa'
  },
  {
    id: 'silence',
    name: 'Silencio & Paz',
    icon: <TreePine className="w-5 h-5" />,
    color: 'var(--color-vibe-silence)',
    zones: ['jose-ignacio', 'garzon', 'pueblo-eden'],
    description: 'Naturaleza, tranquilidad y vistas panorámicas'
  },
  {
    id: 'golf',
    name: 'Golf & Bosque',
    icon: <Activity className="w-5 h-5" />,
    color: 'var(--color-vibe-golf)',
    zones: ['beverly-hills', 'cantegril', 'san-rafael'],
    description: 'Country clubs, campos de golf y aire puro'
  },
  {
    id: 'surf',
    name: 'Surf & Olas',
    icon: <Waves className="w-5 h-5" />,
    color: 'var(--color-vibe-surf)',
    zones: ['la-barra', 'montoya', 'bikini', 'tio-tom'],
    description: 'Playas con olas, escuelas de surf y ambiente joven'
  },
  {
    id: 'family',
    name: 'Familia',
    icon: <Home className="w-5 h-5" />,
    color: 'var(--color-vibe-family)',
    zones: ['pinares', 'san-rafael', 'rincón-del-indio'],
    description: 'Colegios, parques y barrios residenciales seguros'
  }
];

// Zonas de Punta del Este
const ZONES: Zone[] = [
  { id: 'punta-centro', name: 'Punta del Este Centro', center: [-34.9405, -54.9485], vibes: ['nightlife'], winterServices: 45 },
  { id: 'la-barra', name: 'La Barra', center: [-34.8890, -54.8685], vibes: ['nightlife', 'surf'], winterServices: 32 },
  { id: 'manantiales', name: 'Manantiales', center: [-34.8750, -54.8420], vibes: ['nightlife', 'surf'], winterServices: 28 },
  { id: 'jose-ignacio', name: 'José Ignacio', center: [-34.8160, -54.6310], vibes: ['silence'], winterServices: 12 },
  { id: 'garzon', name: 'Garzón', center: [-34.7830, -54.5070], vibes: ['silence'], winterServices: 5 },
  { id: 'beverly-hills', name: 'Beverly Hills', center: [-34.9270, -54.9050], vibes: ['golf'], winterServices: 8 },
  { id: 'cantegril', name: 'Cantegril Country Club', center: [-34.9350, -54.9320], vibes: ['golf'], winterServices: 15 },
  { id: 'san-rafael', name: 'San Rafael', center: [-34.9150, -54.9420], vibes: ['golf', 'family'], winterServices: 22 },
  { id: 'pinares', name: 'Pinares', center: [-34.9080, -54.9280], vibes: ['family'], winterServices: 25 },
  { id: 'montoya', name: 'Montoya', center: [-34.8720, -54.8480], vibes: ['surf'], winterServices: 6 }
];

// Componente de filtro de Vibe
function VibeFilterButton({ 
  filter, 
  isActive, 
  onClick 
}: { 
  filter: VibeFilter; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-full 
        backdrop-blur-xl border transition-all duration-300
        ${isActive 
          ? 'bg-white/90 dark:bg-black/80 border-gold shadow-lg shadow-gold/20' 
          : 'bg-white/60 dark:bg-black/40 border-white/20 hover:border-white/40'
        }
      `}
      style={{
        '--filter-color': filter.color
      } as React.CSSProperties}
    >
      <span 
        className="transition-colors duration-300"
        style={{ color: isActive ? filter.color : 'currentColor' }}
      >
        {filter.icon}
      </span>
      <span className="text-sm font-medium whitespace-nowrap">
        {filter.name}
      </span>
    </motion.button>
  );
}

// Tarjeta de zona al hacer hover
function ZoneInfoCard({ zone }: { zone: Zone }) {
  const vibeFilters = VIBE_FILTERS.filter(v => zone.vibes.includes(v.id));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
    >
      <div className="glass-card rounded-2xl p-5 min-w-[280px] shadow-2xl">
        <h3 className="text-lg font-serif font-bold mb-2">{zone.name}</h3>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {vibeFilters.map(vibe => (
            <span 
              key={vibe.id}
              className="text-xs px-2 py-1 rounded-full"
              style={{ 
                backgroundColor: `${vibe.color}20`,
                color: vibe.color
              }}
            >
              {vibe.name}
            </span>
          ))}
        </div>
        
        {/* Indicador de servicios de invierno */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={`
            w-2 h-2 rounded-full
            ${zone.winterServices > 20 ? 'bg-green-500' : 
              zone.winterServices > 10 ? 'bg-yellow-500' : 'bg-red-500'}
          `} />
          <span>
            {zone.winterServices} servicios abiertos en invierno
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Componente principal
export function LifestyleMap({ properties = [] }: { properties?: Property[] }) {
  const [activeVibes, setActiveVibes] = useState<string[]>([]);
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Toggle de vibe
  const toggleVibe = useCallback((vibeId: string) => {
    setHoveredZone(null);
    setActiveVibes(prev => 
      prev.includes(vibeId) 
        ? prev.filter(v => v !== vibeId)
        : [...prev, vibeId]
    );
  }, []);

  // Filtrar propiedades por vibes activos
  const filteredProperties = useMemo(() => {
    if (activeVibes.length === 0) return properties;
    
    return properties.filter(property => 
      property.lifestyle_tags?.some(tag => activeVibes.includes(tag))
    );
  }, [properties, activeVibes]);

  // Zonas activas basadas en vibes seleccionados
  const activeZones = useMemo(() => {
    if (activeVibes.length === 0) return ZONES;
    
    return ZONES.filter(zone => 
      zone.vibes.some(vibe => activeVibes.includes(vibe))
    );
  }, [activeVibes]);

  // Centro del mapa (Punta del Este)
  const mapCenter: [number, number] = [-34.9205, -54.9485];

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] rounded-2xl overflow-hidden">
      {/* Filtros flotantes */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-wrap justify-center gap-2 px-4"
      >
        {VIBE_FILTERS.map(filter => (
          <VibeFilterButton
            key={filter.id}
            filter={filter}
            isActive={activeVibes.includes(filter.id)}
            onClick={() => toggleVibe(filter.id)}
          />
        ))}
      </motion.div>

      {/* Mapa */}
      <div className="w-full h-full">
        {typeof window !== 'undefined' && (
          <MapContainer
            center={mapCenter}
            zoom={12}
            className="w-full h-full"
            zoomControl={false}
            attributionControl={false}
            whenReady={() => setIsMapLoaded(true)}
          >
            {/* Estilo de mapa oscuro elegante */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Marcadores de propiedades */}
            {filteredProperties.map(property => (
              <Marker
                key={property.id}
                position={property.location}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={property.main_image} 
                      alt={property.title}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                    <h4 className="font-bold text-sm">{property.title}</h4>
                    <p className="text-gold font-semibold">
                      {property.currency} {property.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {property.bedrooms} hab · {property.bathrooms} baños
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Overlay gradient para mejor legibilidad */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/50 via-transparent to-transparent" />

      {/* Card de zona al hover */}
      <AnimatePresence>
        {hoveredZone && <ZoneInfoCard zone={hoveredZone} />}
      </AnimatePresence>

      {/* Contador de propiedades */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute bottom-4 right-4 z-10"
      >
        <div className="glass-card rounded-xl px-4 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium">
              {filteredProperties.length} propiedades · {activeZones.length} zonas
            </span>
          </div>
        </div>
      </motion.div>

      {/* Loading skeleton */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="text-muted-foreground">Cargando mapa...</div>
        </div>
      )}
    </div>
  );
}

export default LifestyleMap;
