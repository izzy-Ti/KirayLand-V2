-- ═══════════════════════════════════════════════════════════
-- ኪራይLand — Full Database Schema
-- PostgreSQL 15+ / Supabase
-- ═══════════════════════════════════════════════════════════

-- ── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- Trigram fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- Composite GIN indexes
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- GIST support for scalar types (UUID, etc.)

-- ── Custom ENUM types ──────────────────────────────────────
CREATE TYPE user_role AS ENUM ('consumer', 'provider', 'admin');
CREATE TYPE trust_tier AS ENUM ('new', 'verified', 'trusted', 'premium');
CREATE TYPE rental_status AS ENUM (
  'pending',
  'active_escrow',
  'item_delivered',
  'returned_pending_review',
  'completed',
  'disputed',
  'cancelled'
);
CREATE TYPE escrow_action AS ENUM (
  'charge_captured',
  'deposit_held',
  'provider_payout_pending',
  'provider_payout_sent',
  'deposit_released',
  'deposit_forfeited',
  'commission_collected',
  'refund_issued',
  'dispute_freeze'
);
CREATE TYPE message_type AS ENUM ('text', 'image', 'system', 'location');

-- ═══════════════════════════════════════════════════════════
-- 1. PROFILES — Extended user identity
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  bio TEXT DEFAULT '',
  role user_role NOT NULL DEFAULT 'consumer',
  trust trust_tier NOT NULL DEFAULT 'new',
  
  -- Verification
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_id_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Ratings
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  rating_count INTEGER NOT NULL DEFAULT 0,
  
  -- Financial
  stripe_customer_id TEXT,
  stripe_connect_id TEXT,     -- For providers to receive payouts
  wallet_balance_etb NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  
  -- Location
  default_location geography(Point, 4326),
  city TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_trust ON public.profiles(trust);
CREATE INDEX idx_profiles_stripe_customer ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_profiles_location ON public.profiles USING GIST(default_location);

-- ═══════════════════════════════════════════════════════════
-- 2. CATEGORIES — Self-referencing tree
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_am TEXT,             -- Amharic name
  slug TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  description TEXT DEFAULT '',
  depth INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_depth ON public.categories(depth);

-- ═══════════════════════════════════════════════════════════
-- 3. ITEMS — Rental listings
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  
  -- Core info
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  
  -- Attributes (brand, model, color, specs, etc.)
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- Pricing (always in ETB)
  price_per_day_etb NUMERIC(10,2) NOT NULL,
  price_per_week_etb NUMERIC(10,2),
  price_per_month_etb NUMERIC(10,2),
  security_deposit_etb NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Location
  location geography(Point, 4326),
  address_text TEXT,
  city TEXT,
  
  -- Media
  cover_image_url TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  
  -- Availability
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  min_rental_days INTEGER NOT NULL DEFAULT 1,
  max_rental_days INTEGER DEFAULT 90,
  
  -- Metrics
  view_count INTEGER NOT NULL DEFAULT 0,
  rental_count INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  rating_count INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIN index for JSONB attribute search
CREATE INDEX idx_items_attributes ON public.items USING GIN(attributes jsonb_path_ops);
CREATE INDEX idx_items_tags ON public.items USING GIN(tags);
CREATE INDEX idx_items_provider ON public.items(provider_id);
CREATE INDEX idx_items_category ON public.items(category_id);
CREATE INDEX idx_items_location ON public.items USING GIST(location);
CREATE INDEX idx_items_price ON public.items(price_per_day_etb);
CREATE INDEX idx_items_published ON public.items(is_published, is_available);
CREATE INDEX idx_items_created ON public.items(created_at DESC);

-- Full-text search index
CREATE INDEX idx_items_fts ON public.items USING GIN(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- ═══════════════════════════════════════════════════════════
-- 4. BOOKINGS_CALENDAR — Reservation date ranges
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.bookings_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  rental_id UUID,  -- Will FK to rentals after it's created
  booked_range TSTZRANGE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent double-booking with exclusion constraint
  EXCLUDE USING GIST (
    item_id WITH =,
    booked_range WITH &&
  )
);

CREATE INDEX idx_bookings_item ON public.bookings_calendar(item_id);
CREATE INDEX idx_bookings_range ON public.bookings_calendar USING GIST(booked_range);

-- ═══════════════════════════════════════════════════════════
-- 5. RENTALS — Full lifecycle tracking
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  consumer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  actual_return_date DATE,
  
  -- Status FSM
  status rental_status NOT NULL DEFAULT 'pending',
  
  -- Pricing snapshot (all in ETB at time of booking)
  total_price_etb NUMERIC(10,2) NOT NULL,
  security_deposit_etb NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Converted amounts (at time of checkout)
  exchange_rate NUMERIC(12,6) NOT NULL,
  total_price_usd NUMERIC(10,2) NOT NULL,
  security_deposit_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  provider_payout_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Stripe references
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_deposit_payment_intent_id TEXT,
  
  -- Handshake verification codes
  checkin_code TEXT,
  checkout_code TEXT,
  checkin_verified_at TIMESTAMPTZ,
  checkout_verified_at TIMESTAMPTZ,
  
  -- Dispute
  dispute_reason TEXT,
  dispute_opened_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,
  dispute_resolution TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  CONSTRAINT different_parties CHECK (consumer_id != provider_id)
);

-- Add FK from bookings_calendar to rentals
ALTER TABLE public.bookings_calendar 
  ADD CONSTRAINT fk_bookings_rental 
  FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE SET NULL;

CREATE INDEX idx_rentals_consumer ON public.rentals(consumer_id);
CREATE INDEX idx_rentals_provider ON public.rentals(provider_id);
CREATE INDEX idx_rentals_item ON public.rentals(item_id);
CREATE INDEX idx_rentals_status ON public.rentals(status);
CREATE INDEX idx_rentals_dates ON public.rentals(start_date, end_date);
CREATE INDEX idx_rentals_stripe_session ON public.rentals(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- 6. ESCROW_LEDGER — Immutable financial audit trail
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.escrow_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE RESTRICT,
  
  action escrow_action NOT NULL,
  
  amount_etb NUMERIC(10,2),
  amount_usd NUMERIC(10,2) NOT NULL,
  exchange_rate NUMERIC(12,6) NOT NULL,
  
  -- References
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,
  
  -- Metadata
  notes TEXT DEFAULT '',
  performed_by UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_escrow_rental ON public.escrow_ledger(rental_id);
CREATE INDEX idx_escrow_action ON public.escrow_ledger(action);
CREATE INDEX idx_escrow_created ON public.escrow_ledger(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- 7. MESSAGES — Real-time chat per rental
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  image_url TEXT,
  
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_rental ON public.messages(rental_id, created_at ASC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_unread ON public.messages(rental_id, is_read) WHERE is_read = FALSE;

-- ═══════════════════════════════════════════════════════════
-- 8. REVIEWS — Post-rental ratings
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One review per rental per direction
  UNIQUE(rental_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_item ON public.reviews(item_id);

-- ═══════════════════════════════════════════════════════════
-- 9. EXCHANGE_RATE_CACHE — Cached conversion rates
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.exchange_rate_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency TEXT NOT NULL DEFAULT 'ETB',
  target_currency TEXT NOT NULL DEFAULT 'USD',
  rate NUMERIC(12,6) NOT NULL,
  source TEXT NOT NULL DEFAULT 'exchangerate-api',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour')
);

CREATE INDEX idx_exchange_rate_latest ON public.exchange_rate_cache(base_currency, target_currency, fetched_at DESC);

-- ═══════════════════════════════════════════════════════════
-- FUNCTIONS — Auto-update timestamps
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_rentals_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════
-- FUNCTION — Auto-create profile on auth sign-up
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- FUNCTION — Update profile rating averages
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id)
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_inserted
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating();

-- ═══════════════════════════════════════════════════════════
-- FUNCTION — Update item rating averages
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_item_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    UPDATE public.items
    SET 
      rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM public.reviews WHERE item_id = NEW.item_id),
      rating_count = (SELECT COUNT(*) FROM public.reviews WHERE item_id = NEW.item_id)
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_item_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_item_rating();

-- ═══════════════════════════════════════════════════════════
-- SEED — Root categories
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.categories (name, name_am, slug, depth, sort_order) VALUES
  ('Electronics',     'ኤሌክትሮኒክስ',    'electronics',     0, 1),
  ('Vehicles',        'ተሽከርካሪዎች',    'vehicles',        0, 2),
  ('Home & Garden',   'ቤትና ጓሮ',      'home-garden',     0, 3),
  ('Tools & Equipment','መሳሪያዎች',     'tools-equipment', 0, 4),
  ('Fashion',         'ፋሽን',          'fashion',         0, 5),
  ('Sports & Outdoors','ስፖርት',       'sports-outdoors', 0, 6),
  ('Events & Party',  'ዝግጅትና ፓርቲ',  'events-party',    0, 7),
  ('Books & Media',   'መጻሕፍት',       'books-media',     0, 8);

-- Subcategories for Electronics
INSERT INTO public.categories (parent_id, name, name_am, slug, depth, sort_order)
SELECT id, sub.name, sub.name_am, sub.slug, 1, sub.sort_order
FROM public.categories c,
LATERAL (VALUES
  ('Smartphones',   'ስማርትፎን',    'smartphones',   1),
  ('Laptops',       'ላፕቶፕ',      'laptops',       2),
  ('Cameras',       'ካሜራ',       'cameras',       3),
  ('Audio',         'ኦዲዮ',       'audio',         4),
  ('Gaming',        'ጌሚንግ',      'gaming',        5),
  ('Drones',        'ድሮን',       'drones',        6)
) AS sub(name, name_am, slug, sort_order)
WHERE c.slug = 'electronics';

-- Subcategories for Vehicles
INSERT INTO public.categories (parent_id, name, name_am, slug, depth, sort_order)
SELECT id, sub.name, sub.name_am, sub.slug, 1, sub.sort_order
FROM public.categories c,
LATERAL (VALUES
  ('Cars',          'መኪና',       'cars',          1),
  ('Motorcycles',   'ሞተርሳይክል',  'motorcycles',   2),
  ('Bicycles',      'ብስክሌት',     'bicycles',      3)
) AS sub(name, name_am, slug, sort_order)
WHERE c.slug = 'vehicles';
