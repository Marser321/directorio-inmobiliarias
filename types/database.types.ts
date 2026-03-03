export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    role: 'admin' | 'agent' | 'user'
                    admin_role: 'super_admin' | 'content_manager' | 'support' | null
                    is_admin: boolean | null
                    avatar_url: string | null
                    phone: string | null
                    whatsapp: string | null
                    bio: string | null
                    license_number: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    role?: 'admin' | 'agent' | 'user'
                    admin_role?: 'super_admin' | 'content_manager' | 'support' | null
                    is_admin?: boolean | null
                    avatar_url?: string | null
                    phone?: string | null
                    whatsapp?: string | null
                    bio?: string | null
                    license_number?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    role?: 'admin' | 'agent' | 'user'
                    admin_role?: 'super_admin' | 'content_manager' | 'support' | null
                    is_admin?: boolean | null
                    avatar_url?: string | null
                    phone?: string | null
                    whatsapp?: string | null
                    bio?: string | null
                    license_number?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            locations: {
                Row: {
                    id: number
                    slug: string
                    name: string
                    type: 'city' | 'zone' | 'neighborhood' | 'beach' | null
                    parent_id: number | null
                    coordinates: unknown | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    slug: string
                    name: string
                    type?: 'city' | 'zone' | 'neighborhood' | 'beach' | null
                    parent_id?: number | null
                    coordinates?: unknown | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    slug?: string
                    name?: string
                    type?: 'city' | 'zone' | 'neighborhood' | 'beach' | null
                    parent_id?: number | null
                    coordinates?: unknown | null
                    created_at?: string
                }
                Relationships: []
            }
            prospect_properties: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    address: string
                    status: string
                    owner_name: string | null
                    owner_whatsapp: string | null
                    last_contact: string | null
                    title: string | null
                    images: string[] | null
                    built_area: number | null
                    land_area: number | null
                    url: string | null
                    [key: string]: any
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    address?: string
                    status?: string
                    owner_name?: string | null
                    owner_whatsapp?: string | null
                    last_contact?: string | null
                    title?: string | null
                    images?: string[] | null
                    built_area?: number | null
                    land_area?: number | null
                    url?: string | null
                    [key: string]: any
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    address?: string
                    status?: string
                    owner_name?: string | null
                    owner_whatsapp?: string | null
                    last_contact?: string | null
                    title?: string | null
                    images?: string[] | null
                    built_area?: number | null
                    land_area?: number | null
                    url?: string | null
                    [key: string]: any
                }
                Relationships: []
            }
            outreach_queue: {
                Row: {
                    id: string
                    created_at: string
                    lead_id: string
                    status: string
                    scheduled_for: string
                    message_body: string | null
                    last_error: string | null
                    channel: string
                    [key: string]: any
                }
                Insert: {
                    id?: string;
                    created_at?: string;
                    lead_id: string;
                    status?: string;
                    scheduled_for?: string;
                    message_body?: string | null;
                    last_error?: string | null;
                    channel?: string;
                    [key: string]: any
                }
                Update: {
                    id?: string;
                    created_at?: string;
                    lead_id?: string;
                    status?: string;
                    scheduled_for?: string;
                    message_body?: string | null;
                    last_error?: string | null;
                    channel?: string;
                    [key: string]: any
                }
                Relationships: [
                    {
                        foreignKeyName: "outreach_queue_lead_id_fkey"
                        columns: ["lead_id"]
                        referencedRelation: "prospect_properties"
                        referencedColumns: ["id"]
                    }
                ]
            }
            outreach_log: {
                Row: {
                    id: string
                    created_at: string
                    lead_id: string
                    queue_id: string | null
                    channel: string
                    direction: string
                    content: string | null
                    metadata: Json | null
                    [key: string]: any
                }
                Insert: {
                    id?: string;
                    created_at?: string;
                    lead_id: string;
                    queue_id?: string | null;
                    channel: string;
                    direction: string;
                    content?: string | null;
                    metadata?: Json | null;
                    [key: string]: any
                }
                Update: {
                    id?: string;
                    created_at?: string;
                    lead_id?: string;
                    queue_id?: string | null;
                    channel?: string;
                    direction?: string;
                    content?: string | null;
                    metadata?: Json | null;
                    [key: string]: any
                }
                Relationships: [
                    {
                        foreignKeyName: "outreach_log_lead_id_fkey"
                        columns: ["lead_id"]
                        referencedRelation: "prospect_properties"
                        referencedColumns: ["id"]
                    }
                ]
            }
            agencies: {
                Row: {
                    id: string | number
                    created_at: string
                    name: string
                    slug: string
                    logo: string | null
                    [key: string]: any
                }
                Insert: {
                    id?: string | number;
                    created_at?: string;
                    name: string;
                    slug: string;
                    logo?: string | null;
                    [key: string]: any
                }
                Update: {
                    id?: string | number;
                    created_at?: string;
                    name?: string;
                    slug?: string;
                    logo?: string | null;
                    [key: string]: any
                }
                Relationships: []
            }
            agency_memberships: {
                Row: {
                    id: number
                    agency_id: number
                    user_id: string
                    role: 'owner' | 'admin' | 'member'
                    created_at: string
                }
                Insert: {
                    id?: number
                    agency_id: number
                    user_id: string
                    role?: 'owner' | 'admin' | 'member'
                    created_at?: string
                }
                Update: {
                    id?: number
                    agency_id?: number
                    user_id?: string
                    role?: 'owner' | 'admin' | 'member'
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "agency_memberships_agency_id_fkey"
                        columns: ["agency_id"]
                        referencedRelation: "agencies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "agency_memberships_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            admin_logs: {
                Row: {
                    id: string
                    created_at: string
                    admin_id: string | null
                    action: string
                    target_resource: string
                    details: Json | null
                    ip_address: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    admin_id?: string | null
                    action: string
                    target_resource: string
                    details?: Json | null
                    ip_address?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    admin_id?: string | null
                    action?: string
                    target_resource?: string
                    details?: Json | null
                    ip_address?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "admin_logs_admin_id_fkey"
                        columns: ["admin_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            properties: {
                Row: {
                    id: string | number
                    created_at: string
                    title: string
                    slug: string
                    agency_id: string | number
                    price: number
                    currency: string
                    status: string
                    is_featured: boolean
                    bedrooms: number
                    bathrooms: number
                    view_count: number
                    main_image: string | null
                    built_area: number | null
                    plot_area: number | null
                    features: Json | null
                    lifestyle_tags: string[] | null
                    featured_until: string | null
                    boost_level: number
                    quality_score: number
                    quality_feedback: string | null
                    [key: string]: any
                }
                Insert: {
                    id?: string | number
                    created_at?: string
                    title: string
                    slug: string
                    agency_id: string | number
                    price: number
                    currency: string
                    status?: string
                    is_featured?: boolean
                    bedrooms?: number
                    bathrooms?: number
                    view_count?: number
                    main_image?: string | null
                    featured_until?: string | null
                    boost_level?: number
                    quality_score?: number
                    quality_feedback?: string | null
                    [key: string]: any
                }
                Update: {
                    id?: string | number
                    created_at?: string
                    title?: string
                    slug?: string
                    agency_id?: string | number
                    price?: number
                    currency?: string
                    status?: string
                    is_featured?: boolean
                    bedrooms?: number
                    bathrooms?: number
                    view_count?: number
                    main_image?: string | null
                    featured_until?: string | null
                    boost_level?: number
                    quality_score?: number
                    quality_feedback?: string | null
                    [key: string]: any
                }
                Relationships: [
                    {
                        foreignKeyName: "properties_agency_id_fkey"
                        columns: ["agency_id"]
                        referencedRelation: "agencies"
                        referencedColumns: ["id"]
                    }
                ]
            }
            scraping_logs: {
                Row: {
                    id: string
                    agency_url: string
                    properties_count: number
                    status: 'pending' | 'processing' | 'completed' | 'failed'
                    scraped_at: string
                    error_message: string | null
                }
                Insert: {
                    id?: string
                    agency_url: string
                    properties_count?: number
                    status: 'pending' | 'processing' | 'completed' | 'failed'
                    scraped_at?: string
                    error_message?: string | null
                }
                Update: {
                    id?: string
                    agency_url?: string
                    properties_count?: number
                    status?: 'pending' | 'processing' | 'completed' | 'failed'
                    scraped_at?: string
                    error_message?: string | null
                }
                Relationships: []
            }

        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Helper types for easier use
export type Agency = Database['public']['Tables']['agencies']['Row']
export type AgencyInsert = Database['public']['Tables']['agencies']['Insert']
export type AgencyUpdate = Database['public']['Tables']['agencies']['Update']

export type AgencyUser = Database['public']['Tables']['agency_memberships']['Row']
export type AgencyUserInsert = Database['public']['Tables']['agency_memberships']['Insert']

export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyInsert = Database['public']['Tables']['properties']['Insert']
export type PropertyUpdate = Database['public']['Tables']['properties']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export type Location = Database['public']['Tables']['locations']['Row']

export type ProspectProperty = Database['public']['Tables']['prospect_properties']['Row']
export type OutreachQueue = Database['public']['Tables']['outreach_queue']['Row']
