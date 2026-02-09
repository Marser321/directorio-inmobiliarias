'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, UseFormReturn, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    ArrowRight,
    ArrowLeft,
    Check,
    Loader2,
    FileText,
    MapPin,
    Settings,
    Image as ImageIcon
} from 'lucide-react'

import { StepBasicInfo } from './StepBasicInfo'
import { StepLocation } from './StepLocation'
import { StepDetails } from './StepDetails'
import { StepMedia } from './StepMedia'
import {
    BasicInfoData,
    LocationData,
    DetailsData,
    MediaData,
    basicInfoSchema,
    locationSchema,
    detailsSchema,
    mediaSchema,
} from './schemas'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

const STEPS = [
    { id: 1, label: 'Información', icon: FileText },
    { id: 2, label: 'Ubicación', icon: MapPin },
    { id: 3, label: 'Detalles', icon: Settings },
    { id: 4, label: 'Multimedia', icon: ImageIcon },
]

interface PropertyWizardProps {
    agencyId: number
    onSuccess?: () => void
    onCancel?: () => void
}

export function PropertyWizard({ agencyId, onSuccess, onCancel }: PropertyWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Separate forms for each step (allows independent validation)
    const basicInfoForm = useForm<BasicInfoData>({
        resolver: zodResolver(basicInfoSchema),
        defaultValues: {
            currency: 'USD',
            status: 'for_sale',
        },
    })

    const locationForm = useForm<LocationData>({
        resolver: zodResolver(locationSchema),
    })

    const detailsForm = useForm<DetailsData>({
        resolver: zodResolver(detailsSchema),
        defaultValues: {
            bedrooms: 0,
            bathrooms: 0,
            garage_spaces: 0,
            amenities: [],
        },
    })

    const mediaForm = useForm<MediaData>({
        resolver: zodResolver(mediaSchema),
        defaultValues: {
            images: [],
            main_image_index: 0,
            video_url: '',
        },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCurrentForm = (): UseFormReturn<any> => {
        switch (currentStep) {
            case 1: return basicInfoForm
            case 2: return locationForm
            case 3: return detailsForm
            case 4: return mediaForm
            default: return basicInfoForm
        }
    }

    const handleNext = async () => {
        const form = getCurrentForm()
        const isValid = await form.trigger()

        if (isValid && currentStep < 4) {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const handleSubmit = async () => {
        // Validate all forms
        const [basicValid, locationValid, detailsValid, mediaValid] = await Promise.all([
            basicInfoForm.trigger(),
            locationForm.trigger(),
            detailsForm.trigger(),
            mediaForm.trigger(),
        ])

        if (!basicValid || !locationValid || !detailsValid || !mediaValid) {
            return
        }

        setIsSubmitting(true)

        try {
            const supabase = getSupabaseBrowserClient()

            // Get current user for owner_id
            const { data: { user } } = await supabase.auth.getUser()

            // Get form data
            const basicData = basicInfoForm.getValues()
            const locationData = locationForm.getValues()
            const detailsData = detailsForm.getValues()
            const mediaData = mediaForm.getValues()

            // Upload images to Supabase Storage
            const imageUrls: string[] = []
            for (const file of mediaData.images) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `properties/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('property-images')
                    .getPublicUrl(filePath)

                imageUrls.push(publicUrl)
            }

            // Generate slug from title
            const slug = basicData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                + '-' + Date.now().toString(36)

            // Create property in database
            // @Jules: Consider refactoring this to use a stored procedure for atomic insert
            const { data: propertyData, error: insertError } = await supabase
                .from('properties')
                .insert({
                    title: basicData.title,
                    slug,
                    price: basicData.price,
                    currency: basicData.currency,
                    status: basicData.status,
                    location_id: locationData.location_id,
                    location_point: locationData.latitude && locationData.longitude
                        ? `POINT(${locationData.longitude} ${locationData.latitude})`
                        : null,
                    bedrooms: detailsData.bedrooms,
                    bathrooms: detailsData.bathrooms,
                    garage_spaces: detailsData.garage_spaces,
                    built_area: detailsData.built_area,
                    plot_area: detailsData.plot_area || null,
                    description: detailsData.description || null,
                    features: {
                        type: basicData.property_type,
                        amenities: detailsData.amenities || [],
                        address: locationData.address,
                    },
                    images: imageUrls, // Keep for backwards compatibility
                    video_url: mediaData.video_url || null,
                    agency_id: agencyId,
                    owner_id: user?.id || null, // NEW: Set owner for RLS
                })
                .select('id')
                .single()

            if (insertError) throw insertError

            // Insert images into property_images table with display_order
            if (propertyData && imageUrls.length > 0) {
                const imageInserts = imageUrls.map((url, index) => ({
                    property_id: propertyData.id,
                    url,
                    display_order: index,
                    caption: index === mediaData.main_image_index ? 'Imagen Principal' : null,
                }))

                const { error: imagesError } = await supabase
                    .from('property_images')
                    .insert(imageInserts)

                if (imagesError) {
                    console.error('Error inserting images:', imagesError)
                    // Don't throw - property was created, images are in array fallback
                }
            }

            // Success!
            onSuccess?.()
        } catch (error) {
            console.error('Error creating property:', error)
            alert('Error al crear la propiedad. Por favor intenta de nuevo.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Step Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center flex-1">
                            <div
                                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                  ${currentStep >= step.id
                                        ? 'bg-gold border-gold text-white'
                                        : 'border-border text-muted-foreground'
                                    }
                `}
                            >
                                {currentStep > step.id ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <step.icon className="w-5 h-5" />
                                )}
                            </div>
                            <span className={`ml-2 text-sm font-medium hidden sm:block ${currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                {step.label}
                            </span>
                            {index < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${currentStep > step.id ? 'bg-gold' : 'bg-border'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Steps */}
            <div className="glass-card rounded-2xl p-6 md:p-8">
                <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                        <StepBasicInfo key="step1" form={basicInfoForm as UseFormReturn<BasicInfoData>} />
                    )}
                    {currentStep === 2 && (
                        <StepLocation key="step2" form={locationForm as UseFormReturn<LocationData>} />
                    )}
                    {currentStep === 3 && (
                        <StepDetails key="step3" form={detailsForm as UseFormReturn<DetailsData>} />
                    )}
                    {currentStep === 4 && (
                        <StepMedia key="step4" form={mediaForm as UseFormReturn<MediaData>} />
                    )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-6 rounded-xl border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors disabled:opacity-50"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Atrás
                        </button>
                    ) : onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-6 rounded-xl border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    )}

                    {currentStep < 4 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex-1 btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2"
                        >
                            Siguiente
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    Publicar Propiedad
                                    <Check className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
