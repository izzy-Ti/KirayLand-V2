// ═══════════════════════════════════════════════════════════
// ኪራይLand — Full TypeScript Database Types
// ═══════════════════════════════════════════════════════════

export type UserRole = 'consumer' | 'provider' | 'admin'
export type TrustTier = 'new' | 'verified' | 'trusted' | 'premium'
export type RentalStatus =
  | 'pending'
  | 'active_escrow'
  | 'item_delivered'
  | 'returned_pending_review'
  | 'completed'
  | 'disputed'
  | 'cancelled'

export type EscrowAction =
  | 'charge_captured'
  | 'deposit_held'
  | 'provider_payout_pending'
  | 'provider_payout_sent'
  | 'deposit_released'
  | 'deposit_forfeited'
  | 'commission_collected'
  | 'refund_issued'
  | 'dispute_freeze'

export type MessageType = 'text' | 'image' | 'system' | 'location'

// ── Table Row Types ────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  bio: string
  role: UserRole
  trust: TrustTier
  is_email_verified: boolean
  is_phone_verified: boolean
  is_id_verified: boolean
  verification_badges: string[]
  rating_avg: number
  rating_count: number
  stripe_customer_id: string | null
  stripe_connect_id: string | null
  wallet_balance_etb: number
  city: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  parent_id: string | null
  name: string
  name_am: string | null
  slug: string
  icon_url: string | null
  description: string
  depth: number
  sort_order: number
  is_active: boolean
  item_count: number
  created_at: string
  // Virtual: children loaded separately
  children?: Category[]
}

export interface ItemAttributes {
  brand?: string
  model?: string
  color?: string
  condition?: 'new' | 'like_new' | 'good' | 'fair'
  year?: number
  specs?: Record<string, string>
  [key: string]: unknown
}

export interface Item {
  id: string
  provider_id: string
  category_id: string
  title: string
  description: string
  attributes: ItemAttributes
  tags: string[]
  price_per_day_etb: number
  price_per_week_etb: number | null
  price_per_month_etb: number | null
  security_deposit_etb: number
  address_text: string | null
  city: string | null
  cover_image_url: string | null
  image_urls: string[]
  is_available: boolean
  min_rental_days: number
  max_rental_days: number | null
  view_count: number
  rental_count: number
  rating_avg: number
  rating_count: number
  is_published: boolean
  is_flagged: boolean
  created_at: string
  updated_at: string
  // Joined
  provider?: Profile
  category?: Category
}

export interface BookingCalendar {
  id: string
  item_id: string
  rental_id: string | null
  booked_range: string // tstzrange as string
  created_at: string
}

export interface Rental {
  id: string
  item_id: string
  consumer_id: string
  provider_id: string
  start_date: string
  end_date: string
  actual_return_date: string | null
  status: RentalStatus
  total_price_etb: number
  security_deposit_etb: number
  exchange_rate: number
  total_price_usd: number
  security_deposit_usd: number
  platform_fee_usd: number
  provider_payout_usd: number
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_deposit_payment_intent_id: string | null
  checkin_code: string | null
  checkout_code: string | null
  checkin_verified_at: string | null
  checkout_verified_at: string | null
  dispute_reason: string | null
  dispute_opened_at: string | null
  dispute_resolved_at: string | null
  dispute_resolution: string | null
  created_at: string
  updated_at: string
  // Joined
  item?: Item
  consumer?: Profile
  provider?: Profile
}

export interface EscrowLedgerEntry {
  id: string
  rental_id: string
  action: EscrowAction
  amount_etb: number | null
  amount_usd: number
  exchange_rate: number
  stripe_transfer_id: string | null
  stripe_refund_id: string | null
  notes: string
  performed_by: string | null
  created_at: string
}

export interface Message {
  id: string
  rental_id: string
  sender_id: string
  content: string
  message_type: MessageType
  image_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  // Joined
  sender?: Profile
}

export interface Review {
  id: string
  rental_id: string
  reviewer_id: string
  reviewee_id: string
  item_id: string | null
  rating: number
  comment: string
  created_at: string
  // Joined
  reviewer?: Profile
  reviewee?: Profile
}

export interface ExchangeRateCache {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  source: string
  fetched_at: string
  expires_at: string
}

// ── Filter Types ───────────────────────────────────────────

export interface ItemFilters {
  search?: string
  category_slug?: string
  min_price?: number
  max_price?: number
  city?: string
  tags?: string[]
  brand?: string
  condition?: string
  min_rating?: number
  available_from?: string
  available_to?: string
  sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'popular'
  page?: number
  limit?: number
}

// ── API Response Types ─────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

export interface CheckoutSessionResponse {
  session_id: string
  session_url: string
  rental_id: string
  amount_usd: number
  exchange_rate: number
}

export interface ExchangeRateResponse {
  rate: number
  source: string
  fetched_at: string
  is_cached: boolean
}
