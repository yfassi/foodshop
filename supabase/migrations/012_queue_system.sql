-- Queue system: allows restaurants to enable a digital queue during peak hours

-- Add queue settings to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS queue_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS queue_max_concurrent integer NOT NULL DEFAULT 5;

-- Queue tickets table
CREATE TABLE IF NOT EXISTS queue_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_session_id text NOT NULL,
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'expired')),
  position integer NOT NULL,
  called_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_queue_tickets_restaurant_status
  ON queue_tickets(restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_session
  ON queue_tickets(restaurant_id, customer_session_id, status);

-- RLS
ALTER TABLE queue_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone can read queue tickets for a restaurant (to see position)
CREATE POLICY "Anyone can view queue tickets"
  ON queue_tickets FOR SELECT
  USING (true);

-- Only service role can insert/update (via API routes)
CREATE POLICY "Service role can manage queue tickets"
  ON queue_tickets FOR ALL
  USING (auth.role() = 'service_role');

-- Function to get next position number for a restaurant
CREATE OR REPLACE FUNCTION next_queue_position(p_restaurant_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT COALESCE(MAX(position), 0) + 1
  FROM queue_tickets
  WHERE restaurant_id = p_restaurant_id
    AND status IN ('waiting', 'active')
    AND created_at > now() - interval '24 hours';
$$;
