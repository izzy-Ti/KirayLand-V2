-- Idempotent wallet deposit tracking (Stripe Checkout sessions)
CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_etb NUMERIC(12,2) NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_user ON public.wallet_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_created ON public.wallet_topups(created_at DESC);

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

-- Users can read their own top-up records
CREATE POLICY "wallet_topups_select_own"
  ON public.wallet_topups FOR SELECT
  USING (auth.uid() = user_id);
