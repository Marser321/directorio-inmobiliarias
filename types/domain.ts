export type UserRole = 'owner' | 'agent' | 'agency_admin' | 'platform_admin'

export type MembershipRole = 'owner' | 'admin' | 'member'

export type ScrapingJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'canceled'

export type ProspectStatus =
  | 'new'
  | 'qualified'
  | 'contacted'
  | 'converted'
  | 'disqualified'

export type ServiceRequestStatus =
  | 'pending'
  | 'in_progress'
  | 'review'
  | 'delivered'
  | 'rejected'

export interface AuthSignupDto {
  email: string
  password: string
  name?: string
}

export interface AuthVerifyOtpDto {
  email?: string
  otp: string
}

export interface AuthSigninDto {
  email: string
  password: string
}

export interface PartnerOnboardingDto {
  agencyName: string
  agencySlug: string
  city: string
  description?: string
  logoKey?: string
}

export interface ScraperJobCreateDto {
  portalUrl: string
  source: string
  agencyId: number
}

export type FunnelEventName =
  | 'hero_search_submitted'
  | 'search_results_loaded'
  | 'search_result_clicked'
  | 'property_viewed'
  | 'whatsapp_clicked'
  | 'lead_form_submitted'
  | 'partner_draft_created'
  | 'partner_property_published'
  | 'compare_opened'
  | 'compare_property_added'
  | 'compare_property_removed'
  | 'saved_search_created'
  | 'whatsapp_alert_sent'

export interface FunnelEventPayload {
  event_name: FunnelEventName
  session_id: string
  page_path: string
  property_id?: number
  agency_id?: number
  referrer?: string
  metadata?: Record<string, unknown>
}

export interface PropertySearchItem {
  id: number
  title: string
  slug: string | null
  description: string | null
  price: number
  currency: string
  status: string
  is_featured: boolean
  boost_level: number | null
  quality_score: number | null
  bedrooms: number | null
  bathrooms: number | null
  built_area: number | null
  plot_area: number | null
  main_image: string | null
  images: string[]
  lifestyle_tags: string[]
  location_id: number | null
  location_name: string | null
  location_slug: string | null
  lat: number | null
  lng: number | null
  coordinate_source?: 'manual' | 'geocoded' | 'centroid' | 'none' | 'unknown' | null
  created_at: string
  ranking_score: number
}

export interface SearchApiRequest {
  q?: string
  status?: 'for_sale' | 'for_rent'
  price_min?: number
  price_max?: number
  bedrooms?: number
  bathrooms?: number
  type?: string
  lifestyles?: string[]
  features?: string[]
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  search_as_move?: boolean
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest'
  cursor?: string
  limit?: number
}

export interface SearchApiResponse {
  data: PropertySearchItem[]
  next_cursor: string | null
  total_estimate: number
  query_ms: number
  ranking_version: string
}

export interface PropertyQualityChecklist {
  minImages: boolean
  descriptionLength: boolean
  hasLocation: boolean
  hasPriceAndCurrency: boolean
  isComplete: boolean
}

export interface LeadCreateRequest {
  property_id: number
  name: string
  phone?: string
  email?: string
  message?: string
  source: 'property_detail' | 'search_result'
}

export interface FavoriteItem {
  id: string
  property_id: number
  created_at: string
}

export interface CompareResponseItem {
  id: number
  title: string
  slug: string | null
  agency_id?: number | null
  price: number
  currency: string
  bedrooms: number | null
  bathrooms: number | null
  built_area: number | null
  location_name: string | null
  main_image: string | null
  status: string
  coordinate_source?: 'manual' | 'geocoded' | 'centroid' | 'none' | 'unknown' | null
  ranking_score: number
}

export interface CompareResponse {
  data: CompareResponseItem[]
}

export interface SavedSearchDto {
  id: string
  name: string
  filters: SearchApiRequest
  channel: 'whatsapp'
  phone_e164: string
  consent_at: string
  is_active: boolean
  last_run_at: string | null
  created_at: string
}

export interface WhatsappAlertDelivery {
  id: string
  saved_search_id: string
  property_id: number
  channel: 'whatsapp'
  provider_message_id: string | null
  status: 'queued' | 'sent' | 'failed'
  error_message: string | null
  created_at: string
}

export interface AgencyDirectoryItem {
  id: number
  name: string
  slug: string
  city: string | null
  tagline: string | null
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  tier_subscription: string | null
  is_verified: boolean
  avg_response_time: number | null
  total_properties: number
  total_views: number
  featured_until: string | null
}

export interface AgencyProfileDto {
  id: number
  name: string
  slug: string
  tagline: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  whatsapp: string | null
  website: string | null
  address: string | null
  city: string | null
  logo_url: string | null
  cover_image_url: string | null
  meta_description: string | null
  year_established: number | null
  languages: string[]
  specialties: string[]
  certifications: string[]
  social_links: {
    instagram: string | null
    facebook: string | null
    linkedin: string | null
    youtube: string | null
    tiktok: string | null
  }
  is_verified: boolean
  tier_subscription: string
  total_properties: number
  total_views: number
}

export interface AgencyProfileUpdateDto {
  name?: string
  slug?: string
  tagline?: string | null
  description?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  whatsapp?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  logo_url?: string | null
  cover_image_url?: string | null
  meta_description?: string | null
  year_established?: number | null
  languages?: string[]
  specialties?: string[]
  certifications?: string[]
  social_links?: {
    instagram?: string | null
    facebook?: string | null
    linkedin?: string | null
    youtube?: string | null
    tiktok?: string | null
  }
}

export type LuxeStudioRequestType = 'property_photos' | 'video_tour' | 'copywriting' | 'social_media'

export type PropertyAssetHealth = 'healthy' | 'needs_media' | 'critical'

export interface LuxeStudioContext {
  service: LuxeStudioRequestType
  propertyId: number | null
  source: string
}

export interface MediaCenterPropertyDto {
  id: number
  title: string
  slug: string | null
  status: string
  price: number
  currency: string
  views: number
  photos_count: number
  has_video: boolean
  has_tour360: boolean
  asset_health: PropertyAssetHealth
  video_url: string | null
  tour_360_url: string | null
  main_image: string | null
  mediaCanonical: boolean
}

export interface CadastreLookupDto {
  padron: string | null
  localidad: string | null
  area_m2: number | null
  geometry_centroid: {
    lat: number
    lng: number
  } | null
  source: 'geocatastro' | 'cache'
  fetched_at: string
}

export type CommissionOperationType = 'sale' | 'rent'
export type CommissionModel = 'percent' | 'fixed' | 'mixed'
export type CommissionVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface AgencyCommissionProfileDto {
  id: string
  agency_id: number
  operation_type: CommissionOperationType
  commission_model: CommissionModel
  commission_percent: number | null
  commission_fixed_amount: number | null
  currency: string
  additional_fees: string | null
  notes: string | null
  verification_status: CommissionVerificationStatus
  evidence_url: string | null
  is_public: boolean
  updated_at: string
}

export interface AgencyCommissionProfileUpdateDto {
  operation_type?: CommissionOperationType
  commission_model?: CommissionModel
  commission_percent?: number | null
  commission_fixed_amount?: number | null
  currency?: string
  additional_fees?: string | null
  notes?: string | null
  verification_status?: CommissionVerificationStatus
  evidence_url?: string | null
  is_public?: boolean
}

export interface AgencyValueScoreDto {
  agency_id: number
  property_id: number | null
  value_score: number
  cost_score: number
  transparency_score: number
  operational_score: number
  commission_snapshot: {
    operation_type: CommissionOperationType | null
    commission_model: CommissionModel | null
    commission_percent: number | null
    commission_fixed_amount: number | null
    currency: string | null
    verification_status: CommissionVerificationStatus | null
    is_public: boolean
  }
  methodology_version: string
  calculated_at: string
}

export interface LegalCommissionGuideDto {
  id: string
  title: string
  scope: string
  summary: string
  source_name: string
  source_url: string
  effective_date: string | null
}
