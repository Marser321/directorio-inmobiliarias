'use client'

import { useState } from 'react'
import {
    Save,
    Globe,
    Shield,
} from 'lucide-react'

export default function AdminSettings() {
    const [settings, setSettings] = useState({
        siteName: 'Luxe Estate',
        contactEmail: 'info@luxeestate.uy',
        maintenanceMode: false,
        allowRegistration: true
    })

    const handleSave = () => {
        // Here we would save to Supabase or a settings table
        alert('Configuración guardada (Simulación)')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">
                        Configuración <span className="text-gold">Global</span>
                    </h1>
                    <p className="text-muted-foreground">Ajustes generales de la plataforma.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="btn-luxe py-2.5 px-6 rounded-xl text-white font-medium flex items-center gap-2 w-fit"
                >
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* General Settings */}
                <div className="glass-card p-6 rounded-2xl border border-border/40">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <Globe className="w-5 h-5 text-gold" />
                        General
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre del Sitio</label>
                            <input
                                type="text"
                                value={settings.siteName}
                                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                className="w-full px-4 py-2 bg-background/50 border border-border rounded-xl focus:border-gold outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email de Contacto</label>
                            <input
                                type="email"
                                value={settings.contactEmail}
                                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                                className="w-full px-4 py-2 bg-background/50 border border-border rounded-xl focus:border-gold outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="glass-card p-6 rounded-2xl border border-border/40">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        Sistema
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <div>
                                <p className="font-medium">Modo Mantenimiento</p>
                                <p className="text-xs text-muted-foreground">Desactiva el acceso público</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-gold' : 'bg-muted'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.maintenanceMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <div>
                                <p className="font-medium">Permitir Registros</p>
                                <p className="text-xs text-muted-foreground">Nuevas agencias pueden registrarse</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, allowRegistration: !settings.allowRegistration })}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.allowRegistration ? 'bg-emerald-500' : 'bg-muted'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.allowRegistration ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
