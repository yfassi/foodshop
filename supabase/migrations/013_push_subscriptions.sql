-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

CREATE INDEX idx_push_subs_restaurant_role ON push_subscriptions(restaurant_id, role);
CREATE INDEX idx_push_subs_order ON push_subscriptions(order_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');
