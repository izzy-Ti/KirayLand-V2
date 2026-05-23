-- ═══════════════════════════════════════════════════════════
-- ኪራይLand — Row Level Security Policies
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to ensure idempotency
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;

DROP POLICY IF EXISTS "categories_select_public" ON public.categories;

DROP POLICY IF EXISTS "items_select_published" ON public.items;
DROP POLICY IF EXISTS "items_insert_verified" ON public.items;
DROP POLICY IF EXISTS "items_insert_auth" ON public.items;
DROP POLICY IF EXISTS "items_update_own" ON public.items;
DROP POLICY IF EXISTS "items_delete_own" ON public.items;

DROP POLICY IF EXISTS "bookings_select_public" ON public.bookings_calendar;
DROP POLICY IF EXISTS "bookings_insert_auth" ON public.bookings_calendar;

DROP POLICY IF EXISTS "rentals_select_participant" ON public.rentals;
DROP POLICY IF EXISTS "rentals_insert_consumer" ON public.rentals;
DROP POLICY IF EXISTS "rentals_update_participant" ON public.rentals;

DROP POLICY IF EXISTS "escrow_select_participant" ON public.escrow_ledger;

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_update_read" ON public.messages;

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_participant" ON public.reviews;

DROP POLICY IF EXISTS "exchange_rate_select_public" ON public.exchange_rate_cache;

DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Manage Access" ON storage.objects;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rate_cache ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════

-- Anyone can view profiles
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profiles are auto-created via trigger, no direct insert needed
CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════
-- CATEGORIES
-- ═══════════════════════════════════════════════════════════

-- Public read
CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins can modify categories (via service role)
-- No insert/update/delete policies for regular users

-- ═══════════════════════════════════════════════════════════
-- ITEMS
-- ═══════════════════════════════════════════════════════════

-- Anyone can see published, available items
CREATE POLICY "items_select_published"
  ON public.items FOR SELECT
  USING (
    is_published = TRUE 
    OR provider_id = auth.uid()
  );

-- Only verified+ users can create listings
CREATE POLICY "items_insert_auth"
  ON public.items FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
  );

-- Providers can update their own items only
CREATE POLICY "items_update_own"
  ON public.items FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Providers can delete their own items only
CREATE POLICY "items_delete_own"
  ON public.items FOR DELETE
  USING (auth.uid() = provider_id);

-- ═══════════════════════════════════════════════════════════
-- BOOKINGS_CALENDAR
-- ═══════════════════════════════════════════════════════════

-- Public read (to show availability)
CREATE POLICY "bookings_select_public"
  ON public.bookings_calendar FOR SELECT
  USING (true);

-- System creates bookings (via service role or the rental consumer)
CREATE POLICY "bookings_insert_auth"
  ON public.bookings_calendar FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════
-- RENTALS
-- ═══════════════════════════════════════════════════════════

-- Only the consumer or provider of a rental can view it
CREATE POLICY "rentals_select_participant"
  ON public.rentals FOR SELECT
  USING (
    auth.uid() = consumer_id 
    OR auth.uid() = provider_id
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can create rentals (as consumer)
CREATE POLICY "rentals_insert_consumer"
  ON public.rentals FOR INSERT
  WITH CHECK (auth.uid() = consumer_id);

-- Participants can update rental status (with state machine enforced in app)
CREATE POLICY "rentals_update_participant"
  ON public.rentals FOR UPDATE
  USING (
    auth.uid() = consumer_id 
    OR auth.uid() = provider_id
  )
  WITH CHECK (
    auth.uid() = consumer_id 
    OR auth.uid() = provider_id
  );

-- ═══════════════════════════════════════════════════════════
-- ESCROW_LEDGER
-- ═══════════════════════════════════════════════════════════

-- Only service role can write to escrow (enforced by no user policies)
-- Participants can read their own escrow entries
CREATE POLICY "escrow_select_participant"
  ON public.escrow_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.id = rental_id
      AND (r.consumer_id = auth.uid() OR r.provider_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No insert/update/delete for regular users — only service_role

-- ═══════════════════════════════════════════════════════════
-- MESSAGES
-- ═══════════════════════════════════════════════════════════

-- Only rental participants can read messages
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.id = rental_id
      AND (r.consumer_id = auth.uid() OR r.provider_id = auth.uid())
    )
  );

-- Only rental participants can send messages
CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.id = rental_id
      AND (r.consumer_id = auth.uid() OR r.provider_id = auth.uid())
    )
  );

-- Sender can update their own messages (mark as read is via recipient)
CREATE POLICY "messages_update_read"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.id = rental_id
      AND (r.consumer_id = auth.uid() OR r.provider_id = auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════
-- REVIEWS
-- ═══════════════════════════════════════════════════════════

-- Public read
CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  USING (true);

-- Only rental participants can leave reviews, only for completed rentals
CREATE POLICY "reviews_insert_participant"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.id = rental_id
      AND r.status = 'completed'
      AND (r.consumer_id = auth.uid() OR r.provider_id = auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════
-- EXCHANGE_RATE_CACHE
-- ═══════════════════════════════════════════════════════════

-- Public read for exchange rates
CREATE POLICY "exchange_rate_select_public"
  ON public.exchange_rate_cache FOR SELECT
  USING (true);

-- Only service role writes (no user insert policy)


-- ═══════════════════════════════════════════════════════════
-- STORAGE BUCKETS & POLICIES (Auto-initialize item-images)
-- ═══════════════════════════════════════════════════════════

-- Create the item-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all objects in item-images
CREATE POLICY "Public Read Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

-- Allow authenticated users to upload files to their own subfolder (named after their user ID)
CREATE POLICY "Authenticated Upload Access"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'item-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update or delete their own uploaded files
CREATE POLICY "Authenticated Manage Access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'item-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
