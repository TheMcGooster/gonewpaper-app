-- ================================================
-- SAMPLE DATA FOR CELEBRATIONS OF LIFE TAB
-- ================================================
-- Run this in Supabase SQL Editor to populate the
-- In Memory tab with recent obituaries from Chariton.
-- ================================================

-- Recent obituaries from Fielding and Pierschbacher funeral homes
INSERT INTO celebrations_of_life (full_name, birth_date, passing_date, age, obituary, service_location, funeral_home, funeral_home_url, town_id, is_approved)
VALUES
(
  'Marjorie Irene Boyce',
  'June 25, 1942',
  'January 14, 2026',
  83,
  NULL,
  'Chariton, IA',
  'Fielding Funeral Home',
  'https://www.fieldingfuneralhomes.com/obituary/Marjorie-Boyce',
  1,
  true
),
(
  'Dolores Carroll',
  NULL,
  'January 5, 2026',
  NULL,
  NULL,
  'Chariton, IA',
  'Pierschbacher Funeral Home',
  'https://www.pierschbacherfuneralhome.com/obituaries/Dolores-Carroll?obId=46863120',
  1,
  true
),
(
  'Byron Dean Clark',
  NULL,
  NULL,
  NULL,
  NULL,
  'Chariton, IA',
  'Fielding Funeral Home',
  'https://www.fieldingfuneralhomes.com/obituary/Byron-Clark',
  1,
  true
),
(
  'Patricia Ann Lewis',
  'February 5, 1943',
  'December 7, 2025',
  82,
  NULL,
  'Chariton, IA',
  'Fielding Funeral Home',
  'https://www.fieldingfuneralhomes.com/obituary/PatriciaPat-Lewis',
  1,
  true
),
(
  'Doyle Keith Hoover Sr.',
  'December 26, 1941',
  'August 9, 2025',
  83,
  NULL,
  'Chariton, IA',
  'Fielding Funeral Home',
  'https://www.fieldingfuneralhomes.com/obituary/Doyle-HooverSr',
  1,
  true
);

-- Verify the data was inserted
SELECT id, full_name, passing_date, funeral_home FROM celebrations_of_life ORDER BY id DESC LIMIT 10;
