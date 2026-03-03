"use client";

import { useState } from "react";
import { Copy, Check, Sparkles, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function GeneratorForm() {
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [demoLink, setDemoLink] = useState("");
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setIsLoading(true);

        // Simulate AI Generation Process
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Generate a mock demo link
        const cleanUrl = url.replace(/https?:\/\//, "").replace("www.", "").split("/")[0];
        const generatedLink = `https://luxe-estate.app/demo/${cleanUrl}?token=premium_preview`;

        setDemoLink(generatedLink);
        setIsGenerated(true);
        setIsLoading(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(demoLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full max-w-xl mx-auto space-y-8">
            {!isGenerated ? (
                <Card className="border-white/10 bg-white/5 backdrop-blur-md overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardContent className="p-8 space-y-6 relative z-10">
                        <div className="space-y-2 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-purple-500/20">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Generar Landing Premium</h2>
                            <p className="text-white/60">
                                Ingresa la URL de la inmobiliaria y nuestra IA rediseñará su presencia digital en segundos.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                <Input
                                    type="url"
                                    placeholder="https://inmobiliaria-ejemplo.com"
                                    className="pl-10 h-12 bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-purple-500"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-purple-900/20 transition-all duration-300 transform hover:scale-[1.02]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Analizando diseño actual...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Generar Demo <ArrowRight className="w-4 h-4" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-green-500/30 bg-green-500/5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <CardContent className="p-8 space-y-6 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-2">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white">¡Demo Generada con Éxito!</h3>
                            <p className="text-white/60">
                                La landing page optimizada para <span className="text-white font-medium">{url}</span> está lista.
                            </p>
                        </div>

                        <div className="p-4 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between gap-4">
                            <code className="text-sm text-green-400 truncate flex-1 text-left">
                                {demoLink}
                            </code>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-white/10 text-white/70 hover:text-white"
                                onClick={copyToClipboard}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>

                        <Button
                            className="w-full bg-white text-black hover:bg-white/90 font-medium"
                            onClick={() => {
                                setIsGenerated(false);
                                setUrl("");
                                setDemoLink("");
                            }}
                        >
                            Generar otra
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
