'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useForm, UseFormReturn } from 'react-hook-form'
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
import { trackFunnelEvent } from '@/lib/analytics/funnel'

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

type UploadState = {
    status: 'idle' | 'queued' | 'uploading' | 'retrying' | 'uploaded' | 'failed'
    progress: number
    attempts: number
    error?: string
}

type UploadedImage = {
    key: string
    url: string
}

type UploadFailure = {
    index: number
    fileKey: string
    fileName: string
    error: Error
}

function getFileKey(file: File) {
    return `${file.name}:${file.size}:${file.lastModified}`
}

export function PropertyWizard({ agencyId, onSuccess, onCancel }: PropertyWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadState>>({})
    const [failedUploads, setFailedUploads] = useState<string[]>([])
    const [uploadedImageCache, setUploadedImageCache] = useState<Record<string, UploadedImage>>({})
    const [lastSubmissionIntent, setLastSubmissionIntent] = useState<'draft' | 'pending_review' | null>(null)

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
            tour_360_url: '',
        },
    })

    const storageKey = `property_wizard_draft_${agencyId}`

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

    useEffect(() => {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
        if (!raw) return

        try {
            const parsed = JSON.parse(raw) as {
                basic?: Partial<BasicInfoData>
                location?: Partial<LocationData>
                details?: Partial<DetailsData>
                media?: Partial<MediaData>
            }

            if (parsed.basic) basicInfoForm.reset({ ...basicInfoForm.getValues(), ...parsed.basic })
            if (parsed.location) locationForm.reset({ ...locationForm.getValues(), ...parsed.location })
            if (parsed.details) detailsForm.reset({ ...detailsForm.getValues(), ...parsed.details })
            if (parsed.media) {
                mediaForm.setValue('main_image_index', parsed.media.main_image_index ?? 0)
                mediaForm.setValue('video_url', parsed.media.video_url || '')
                mediaForm.setValue('tour_360_url', parsed.media.tour_360_url || '')
            }
        } catch {
            // Ignore invalid local draft payloads.
        }
    }, [storageKey, basicInfoForm, locationForm, detailsForm, mediaForm])

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            const payload = {
                basic: basicInfoForm.getValues(),
                location: locationForm.getValues(),
                details: detailsForm.getValues(),
                media: {
                    main_image_index: mediaForm.getValues('main_image_index'),
                    video_url: mediaForm.getValues('video_url'),
                    tour_360_url: mediaForm.getValues('tour_360_url'),
                },
            }
            window.localStorage.setItem(storageKey, JSON.stringify(payload))
        }, 7000)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [storageKey, basicInfoForm, locationForm, detailsForm, mediaForm])

    const detailsValues = detailsForm.watch()
    const locationValues = locationForm.watch()
    const mediaValues = mediaForm.watch()
    const basicPrice = basicInfoForm.watch('price')
    const basicCurrency = basicInfoForm.watch('currency')

    const checklistMinImages = (mediaValues.images?.length || 0) >= 5
    const checklistDescriptionLength = (detailsValues.description?.trim().length || 0) >= 120
    const checklistHasCoordinates =
        typeof locationValues.latitude === 'number' &&
        Number.isFinite(locationValues.latitude) &&
        typeof locationValues.longitude === 'number' &&
        Number.isFinite(locationValues.longitude)
    const checklistHasLocation =
        Boolean(locationValues.location_id) &&
        Boolean(locationValues.address?.trim()) &&
        checklistHasCoordinates
    const checklistHasPriceAndCurrency = Boolean(basicPrice) && Boolean(basicCurrency)

    const buildPublicationChecklist = {
        minImages: checklistMinImages,
        descriptionLength: checklistDescriptionLength,
        hasLocation: checklistHasLocation,
        hasPriceAndCurrency: checklistHasPriceAndCurrency,
        isComplete: checklistMinImages && checklistDescriptionLength && checklistHasLocation && checklistHasPriceAndCurrency,
    }

    const uploadFileWithRetry = async (
        supabaseClient: ReturnType<typeof getSupabaseBrowserClient>,
        file: File,
        maxRetries = 2
    ): Promise<UploadedImage> => {
        let lastError: Error | null = null
        const fileKey = getFileKey(file)
        const fileExt = file.name.split('.').pop() || 'jpg'

        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            const nextStatus: UploadState = {
                status: attempt === 0 ? 'uploading' : 'retrying',
                progress: Math.min(20 + attempt * 30, 85),
                attempts: attempt + 1,
            }
            setUploadStatuses((prev) => ({
                ...prev,
                [fileKey]: nextStatus,
            }))

            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExt}`
            const filePath = `properties/${fileName}`

            const uploadResult = await supabaseClient.storage
                .from('property-images')
                .upload(filePath, file)
            const uploadData = uploadResult.data as { path?: string; Key?: string } | null
            const uploadError = uploadResult.error as unknown

            if (!uploadError) {
                const { data: { publicUrl } } = supabaseClient.storage.from('property-images').getPublicUrl(filePath)
                const storedKey = uploadData?.path || filePath
                setUploadStatuses((prev) => ({
                    ...prev,
                    [fileKey]: {
                        status: 'uploaded',
                        progress: 100,
                        attempts: attempt + 1,
                    },
                }))
                return { key: storedKey, url: publicUrl }
            }

            const uploadErrorMessage = typeof uploadError === 'object' && uploadError && 'message' in uploadError
                ? String((uploadError as { message?: string }).message || 'Upload failed')
                : 'Upload failed'
            lastError = uploadError instanceof Error ? uploadError : new Error(uploadErrorMessage)
        }

        setUploadStatuses((prev) => ({
            ...prev,
            [fileKey]: {
                status: 'failed',
                progress: 100,
                attempts: maxRetries + 1,
                error: lastError?.message || 'No se pudo subir la imagen',
            },
        }))
        throw lastError || new Error('No se pudo subir la imagen')
    }

    const uploadImagesInParallel = async (
        supabaseClient: ReturnType<typeof getSupabaseBrowserClient>,
        files: File[],
        existingCache: Record<string, UploadedImage>,
        concurrency = 3
    ): Promise<{ uploaded: Array<UploadedImage | null>; failed: UploadFailure[]; nextCache: Record<string, UploadedImage> }> => {
        const uploaded: Array<UploadedImage | null> = []
        const failed: UploadFailure[] = []
        const nextCache: Record<string, UploadedImage> = {}
        let cursor = 0

        setUploadStatuses((prev) => {
            const next = { ...prev }
            files.forEach((file) => {
                const fileKey = getFileKey(file)
                if (existingCache[fileKey]) {
                    next[fileKey] = {
                        status: 'uploaded',
                        progress: 100,
                        attempts: next[fileKey]?.attempts || 1,
                    }
                } else {
                    next[fileKey] = {
                        status: 'queued',
                        progress: 0,
                        attempts: next[fileKey]?.attempts || 0,
                    }
                }
            })
            return next
        })

        const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
            while (cursor < files.length) {
                const fileIndex = cursor
                cursor += 1
                const file = files[fileIndex]
                const fileKey = getFileKey(file)

                if (existingCache[fileKey]) {
                    uploaded[fileIndex] = existingCache[fileKey]
                    nextCache[fileKey] = existingCache[fileKey]
                    continue
                }

                try {
                    const result = await uploadFileWithRetry(supabaseClient, file)
                    uploaded[fileIndex] = result
                    nextCache[fileKey] = result
                } catch (error) {
                    const normalizedError = error instanceof Error ? error : new Error('No se pudo subir la imagen')
                    failed.push({
                        index: fileIndex,
                        fileKey,
                        fileName: file.name,
                        error: normalizedError,
                    })
                    uploaded[fileIndex] = null
                }
            }
        })

        await Promise.all(workers)
        return { uploaded, failed, nextCache }
    }

    const createProperty = async (publicationStatus: 'draft' | 'pending_review') => {
        setSubmitError(null)
        setLastSubmissionIntent(publicationStatus)
        setFailedUploads([])

        const needsFullValidation = publicationStatus !== 'draft'

        if (needsFullValidation) {
            const [basicValid, locationValid, detailsValid, mediaValid] = await Promise.all([
                basicInfoForm.trigger(),
                locationForm.trigger(),
                detailsForm.trigger(),
                mediaForm.trigger(),
            ])

            if (!basicValid || !locationValid || !detailsValid || !mediaValid) {
                setSubmitError('Completa los datos requeridos para publicar.')
                return
            }
        } else {
            const [basicValid, locationValid] = await Promise.all([
                basicInfoForm.trigger(['title', 'price', 'status', 'property_type', 'currency']),
                locationForm.trigger(['location_id', 'address']),
            ])
            if (!basicValid || !locationValid) {
                setSubmitError('Para guardar borrador rápido debes completar título, precio, tipo y ubicación.')
                return
            }
        }

        if (publicationStatus === 'pending_review' && !buildPublicationChecklist.isComplete) {
            setSubmitError('Checklist incompleto: agrega al menos 5 fotos, descripción > 120 caracteres y datos completos.')
            return
        }

        const mediaData = mediaForm.getValues()
        if (mediaData.images.length === 0) {
            setSubmitError('Sube al menos 1 imagen para continuar.')
            return
        }

        setIsSubmitting(true)

        try {
            const supabase = getSupabaseBrowserClient()

            // Get form data
            const basicData = basicInfoForm.getValues()
            const locationData = locationForm.getValues()
            const detailsData = detailsForm.getValues()
            const {
                uploaded,
                failed,
                nextCache,
            } = await uploadImagesInParallel(supabase, mediaData.images, uploadedImageCache, 4)

            if (Object.keys(nextCache).length > 0) {
                setUploadedImageCache((prev) => ({
                    ...prev,
                    ...nextCache,
                }))
            }

            if (failed.length > 0) {
                const uniqueFailedNames = [...new Set(failed.map((entry) => entry.fileName))]
                setFailedUploads(uniqueFailedNames)
                const preview = uniqueFailedNames.slice(0, 3).join(', ')
                throw new Error(
                    `Falló la subida de ${failed.length} imagen${failed.length > 1 ? 'es' : ''} (${preview}). Reintenta y solo se subirán las pendientes.`
                )
            }

            const uploadedImages = uploaded.map((entry, index) => {
                if (!entry) {
                    throw new Error(`No se pudo completar la carga de la imagen #${index + 1}`)
                }
                return entry
            })

            const mainIndex = Math.min(
                Math.max(mediaData.main_image_index ?? 0, 0),
                Math.max(uploadedImages.length - 1, 0)
            )

            type MediaPayloadItem = {
                media_type: 'image' | 'video' | 'tour360'
                url: string
                key: string | null
                display_order: number
                is_primary: boolean
            }

            const mediaPayload: MediaPayloadItem[] = uploadedImages.map((image, index) => ({
                media_type: 'image',
                url: image.url,
                key: image.key,
                display_order: index,
                is_primary: index === mainIndex,
            }))

            if (mediaData.video_url) {
                mediaPayload.push({
                    media_type: 'video',
                    url: mediaData.video_url,
                    key: null,
                    display_order: mediaPayload.length,
                    is_primary: mediaPayload.length === 0,
                })
            }

            if (mediaData.tour_360_url) {
                mediaPayload.push({
                    media_type: 'tour360',
                    url: mediaData.tour_360_url,
                    key: null,
                    display_order: mediaPayload.length,
                    is_primary: mediaPayload.length === 0,
                })
            }

            const response = await fetch('/api/partners/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: basicData.title,
                    price: basicData.price,
                    currency: basicData.currency,
                    status: basicData.status,
                    location_id: locationData.location_id,
                    address: locationData.address || null,
                    latitude: locationData.latitude ?? null,
                    longitude: locationData.longitude ?? null,
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
                    lifestyle_tags: detailsData.amenities || [],
                    video_url: mediaData.video_url || null,
                    tour_360_url: mediaData.tour_360_url || null,
                    agency_id: agencyId,
                    media: mediaPayload,
                    publication_status: publicationStatus,
                }),
            })

            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload.error || 'Error al crear la propiedad')
            }

            const createdPropertyId = payload?.data?.property?.id as number | undefined
            const coordinateSource =
                typeof payload?.data?.coordinate_source === 'string' ? payload.data.coordinate_source : null
            if (publicationStatus === 'draft') {
                await trackFunnelEvent('partner_draft_created', {
                    agency_id: agencyId,
                    property_id: createdPropertyId,
                    metadata: {
                        media_count: uploadedImages.length,
                        publication_status: 'draft',
                        ...(coordinateSource ? { coordinate_source: coordinateSource } : {}),
                    },
                })
            } else {
                await trackFunnelEvent('partner_property_published', {
                    agency_id: agencyId,
                    property_id: createdPropertyId,
                    metadata: {
                        media_count: uploadedImages.length,
                        checklist_complete: true,
                        publication_status: 'pending_review',
                        ...(coordinateSource ? { coordinate_source: coordinateSource } : {}),
                    },
                })
            }

            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(storageKey)
            }

            setUploadStatuses({})
            setUploadedImageCache({})
            setFailedUploads([])

            onSuccess?.()
        } catch (error) {
            console.error('Error creating property:', error)
            setSubmitError(error instanceof Error ? error.message : 'Error al crear la propiedad. Por favor intenta de nuevo.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmit = async () => {
        await createProperty('pending_review')
    }

    const handleQuickDraft = async () => {
        await createProperty('draft')
    }

    const handleRetryFailedUploads = async () => {
        await createProperty(lastSubmissionIntent || 'pending_review')
    }

    const checklistItems = [
        {
            key: 'images',
            label: 'Mínimo 5 fotos',
            valid: buildPublicationChecklist.minImages,
        },
        {
            key: 'description',
            label: 'Descripción mayor a 120 caracteres',
            valid: buildPublicationChecklist.descriptionLength,
        },
        {
            key: 'location',
            label: 'Ubicación válida y completa',
            valid: buildPublicationChecklist.hasLocation,
        },
        {
            key: 'price',
            label: 'Precio y moneda definidos',
            valid: buildPublicationChecklist.hasPriceAndCurrency,
        },
    ]

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
                        <StepMedia
                            key="step4"
                            form={mediaForm as UseFormReturn<MediaData>}
                            uploadStatuses={uploadStatuses}
                            isSubmitting={isSubmitting}
                        />
                    )}
                </AnimatePresence>

                {currentStep === 4 ? (
                    <div className="mt-6 rounded-xl border border-border/70 bg-background/50 p-4">
                        <p className="text-sm font-medium text-foreground mb-3">
                            Checklist para publicar
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {checklistItems.map((item) => (
                                <div
                                    key={item.key}
                                    className={`text-xs rounded-lg px-3 py-2 border ${item.valid
                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                        }`}
                                >
                                    {item.valid ? 'Listo' : 'Pendiente'}: {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

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
                        <div className="flex-1 flex gap-3">
                            <button
                                type="button"
                                onClick={handleQuickDraft}
                                disabled={isSubmitting}
                                className="flex-1 py-3 px-6 rounded-xl border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors disabled:opacity-50"
                            >
                                Guardar borrador
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 btn-luxe py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {lastSubmissionIntent === 'draft' ? 'Guardando...' : 'Publicando...'}
                                    </>
                                ) : (
                                    <>
                                        Publicar Propiedad
                                        <Check className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
                {submitError ? (
                    <p className="mt-3 text-sm text-red-400">{submitError}</p>
                ) : null}
                {failedUploads.length > 0 && !isSubmitting ? (
                    <button
                        type="button"
                        onClick={handleRetryFailedUploads}
                        className="mt-3 text-sm text-gold hover:underline"
                    >
                        Reintentar imágenes fallidas ({failedUploads.length})
                    </button>
                ) : null}
            </div>
        </div>
    )
}
