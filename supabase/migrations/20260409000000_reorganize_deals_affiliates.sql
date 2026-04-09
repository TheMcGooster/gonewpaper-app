-- Migration: reorganize_deals_affiliates
-- Created: 2026-04-09
-- Reorganizes affiliate rows to support the new Deals tab layout with
-- four sections: Featured, Health & Wellness, Pet Picks, Money & Tools.
--
-- - Updates existing rows (Everyday Dose, Take Profit Trader) to the new
--   category scheme and adds descriptions used as card subheaders.
-- - Inserts new product rows: Magnesium, Electrolytes, Protein, Corgi Approved.
-- - display_order reserves 1-9 for Health & Wellness, 10-19 for Pet Picks,
--   20+ for Money & Tools so rendering order stays stable.

UPDATE affiliates
SET category      = 'Health & Wellness',
    description   = 'Steady energy. No crash.',
    display_order = 1
WHERE name = 'Everyday Dose';

UPDATE affiliates
SET category      = 'Money & Tools',
    description   = 'Trade with structure and access to funding.',
    display_order = 20
WHERE name = 'Take Profit Trader';

INSERT INTO affiliates
  (name,            category,            logo_emoji, url,                                commission, description,                             is_active, display_order, clicks)
VALUES
  ('Magnesium',     'Health & Wellness', '🌙',       'https://a.co/d/01Ce2OGJ',          '',         'Sleep better. Stress less.',            true,      2,             0),
  ('Electrolytes',  'Health & Wellness', '💧',       'https://amzn.to/4lZGFgV',          '',         'Hydration that actually helps.',        true,      3,             0),
  ('Protein',       'Health & Wellness', '💪',       'https://amzn.to/4bJWXqR',          '',         'Easy, no-prep nutrition.',              true,      4,             0),
  ('Corgi Approved','Pet Picks',         '🐕',       'https://beacons.ai/corgicopilots', '',         'Real solutions for real dog problems.', true,      10,            0)
ON CONFLICT DO NOTHING;
