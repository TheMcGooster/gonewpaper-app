-- =============================================================
-- KNOXVILLE, IOWA - SEED DATA
-- Run this in Supabase SQL Editor
-- Town ID: 2 (Knoxville)
-- =============================================================

-- 1. Verify Knoxville town exists
SELECT id, name, mascot, primary_color, secondary_color
FROM towns WHERE id = 2;

-- 2. Insert Knoxville Community Quick Links as Businesses (tier: 'free')
-- These show up in the Business Directory tab as community resources
INSERT INTO businesses (name, category, website, phone, tagline, featured, logo_emoji, clicks, tier, town_id, description, address)
VALUES
  ('Knoxville Chamber of Commerce', 'Community', 'https://www.knoxvilleiowa.com', '(641) 842-2858', 'Promoting Knoxville business & community', true, '🏛️', 0, 'free', 2, 'The Knoxville Area Chamber of Commerce supports local businesses and promotes community growth in Knoxville, Iowa.', '305 S 3rd St, Knoxville, IA 50138'),
  ('City of Knoxville', 'Government', 'https://knoxvilleia.gov', '(641) 828-0555', 'Official city government website', true, '🏙️', 0, 'free', 2, 'Official website for the City of Knoxville, Iowa. City services, permits, council meetings, and community calendar.', '305 S 3rd St, Knoxville, IA 50138'),
  ('Knoxville Raceway', 'Entertainment', 'https://www.knoxvilleraceway.com', '(641) 842-5431', 'Sprint Car Capital of the World', true, '🏎️', 0, 'free', 2, 'World-famous half-mile dirt oval. Home of the Knoxville Nationals - the biggest sprint car race in the world.', '1000 N Lincoln St, Knoxville, IA 50138'),
  ('Knoxville Public Library', 'Education', 'https://www.knoxvillepubliclibrary.org', '(641) 828-0585', 'Your community library', true, '📚', 0, 'free', 2, 'Knoxville Public Library offers books, programs, meeting rooms, and community events for all ages.', '213 E Montgomery St, Knoxville, IA 50138'),
  ('Knoxville Community School District', 'Education', 'https://www.knoxville.k12.ia.us', '(641) 842-2184', 'Home of the Panthers', true, '🎓', 0, 'free', 2, 'Knoxville Community School District - educating students from pre-K through 12th grade. Go Panthers!', '309 W Main St, Knoxville, IA 50138'),
  ('National Sprint Car Hall of Fame', 'Entertainment', 'https://www.sprintcarhof.com', '(641) 842-6176', 'Preserving sprint car racing history', false, '🏆', 0, 'free', 2, 'Located at the Knoxville Raceway, the National Sprint Car Hall of Fame & Museum preserves the history of sprint car racing.', '1 Sprint Capital Pl, Knoxville, IA 50138'),
  ('Marion County Courthouse', 'Government', 'https://www.marioncountyiowa.gov', '(641) 828-2207', 'Marion County government services', false, '⚖️', 0, 'free', 2, 'Marion County government offices, courts, and public records. Knoxville is the county seat of Marion County.', '214 E Main St, Knoxville, IA 50138'),
  ('Red Rock Area Tourism', 'Tourism', 'https://www.redrockarea.com', '(641) 842-4522', 'Discover the Red Rock Area', false, '🗺️', 0, 'free', 2, 'Explore Red Rock Lake, trails, parks, and attractions in the Knoxville and Marion County area.', 'Knoxville, IA 50138')
ON CONFLICT DO NOTHING;

-- 3. Seed Knoxville Raceway 2026 Events
-- These are the confirmed 2026 schedule events
INSERT INTO events (title, category, date, time, location, price, source, source_url, verified, town_id, description)
VALUES
  -- April 2026
  ('Practice Night - 360 & 410 Sprints', '🏎️', '2026-04-17', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Season opener practice night featuring Randall Roofing 360 Sprints, Leighton State Bank 410 Sprints, and Pro Sprints.'),
  ('73rd Annual Season Opener', '🏎️', '2026-04-18', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Pella Motors/Kraig Ford Season Opener featuring 360 Sprints, 410 Sprints, and Pro Sprints.'),
  ('Premier Chevy Dealers Clash', '🏎️', '2026-04-24', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Premier Chevy Dealers Clash night 1.'),
  ('World of Outlaws Night #1', '🏎️', '2026-04-25', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'World of Outlaws Sprint Car Series at Knoxville Raceway.'),
  -- May 2026
  ('Knoxville Championship Series', '🏎️', '2026-05-02', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Weekly championship series racing at the Sprint Car Capital of the World.'),
  ('Knoxville Championship Series', '🏎️', '2026-05-09', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Weekly championship series racing.'),
  ('Dennison Racing Tees/Jersey Freeze Night', '🏎️', '2026-05-16', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Sponsored night of racing at Knoxville Raceway.'),
  ('World of Outlaws - Stars & Stripes Salute', '🏎️', '2026-05-23', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'World of Outlaws Stars & Stripes Salute event.'),
  ('Corn Belt Clash - USAC Night #1', '🏎️', '2026-05-29', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Avanti Windows and Doors Corn Belt Clash featuring USAC racing.'),
  ('Corn Belt Clash - USAC Night #2', '🏎️', '2026-05-30', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Avanti Windows and Doors Corn Belt Clash night 2.'),
  -- June 2026
  ('Knoxville Championship Series Weekly', '🏎️', '2026-06-06', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Weekly championship series racing.'),
  ('Premier Chevy Dealers Clash / WoO Night #1', '🏎️', '2026-06-12', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Premier Chevy Dealers Clash and World of Outlaws night 1.'),
  ('World of Outlaws Night #2', '🏎️', '2026-06-13', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'World of Outlaws Sprint Car Series night 2.'),
  ('Farm Bureau Financial Services Night', '🏎️', '2026-06-27', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Farm Bureau Financial Services sponsored night of racing.'),
  -- July 2026
  ('Independence Day Racing', '🏎️', '2026-07-04', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Fourth of July racing at Knoxville Raceway.'),
  ('Knoxville Championship Series', '🏎️', '2026-07-11', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Weekly championship series racing.'),
  ('Knoxville Championship Series', '🏎️', '2026-07-18', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Weekly championship series racing.'),
  ('Knoxville Championship Series', '🏎️', '2026-07-25', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Weekly championship series racing.'),
  -- August 2026 - THE BIG ONES
  ('Weiler Night & 410 Border Battle', '🏎️', '2026-08-01', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Weiler Night and 410 Border Battle at Knoxville Raceway.'),
  ('360 Knoxville Nationals - Night 1', '🏎️', '2026-08-06', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, '360 Knoxville Nationals preliminary night 1. One of the biggest 360 sprint car events in the world.'),
  ('360 Knoxville Nationals - Night 2', '🏎️', '2026-08-07', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, '360 Knoxville Nationals preliminary night 2.'),
  ('360 Knoxville Nationals - Night 3', '🏎️', '2026-08-08', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, '360 Knoxville Nationals preliminary night 3.'),
  ('360 Knoxville Nationals - Championship', '🏎️', '2026-08-09', '6:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, '360 Knoxville Nationals Championship night! The biggest 360 sprint car race of the year.'),
  ('65th Knoxville Nationals - Night 1', '🏎️', '2026-08-12', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'The 65th Annual Knoxville Nationals - the biggest sprint car race in the world! World of Outlaws preliminary night 1.'),
  ('65th Knoxville Nationals - Night 2', '🏎️', '2026-08-13', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, '65th Knoxville Nationals World of Outlaws preliminary night 2.'),
  ('65th Knoxville Nationals - Night 3', '🏎️', '2026-08-14', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, '65th Knoxville Nationals World of Outlaws preliminary night 3.'),
  ('65th Knoxville Nationals - Championship', '🏎️', '2026-08-15', '6:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'THE championship night of the 65th Knoxville Nationals. The crown jewel of sprint car racing.'),
  ('McKay Group Season Championship Night', '🏎️', '2026-08-29', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Season championship night - final points race of the 2026 season.'),
  -- September 2026
  ('Lucas Oil Late Model Knoxville Nationals - Night 1', '🏎️', '2026-09-17', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Lucas Oil Late Model Knoxville Nationals preliminary night 1.'),
  ('Lucas Oil Late Model Knoxville Nationals - Night 2', '🏎️', '2026-09-18', '7:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Lucas Oil Late Model Knoxville Nationals preliminary night 2.'),
  ('Lucas Oil Late Model Knoxville Nationals - Championship', '🏎️', '2026-09-19', '6:00 PM', 'Knoxville Raceway', 'Varies', 'Knoxville Raceway', 'https://www.knoxvilleraceway.com/schedule/', true, 2, 'Lucas Oil Late Model Knoxville Nationals Championship night.')
ON CONFLICT DO NOTHING;

-- 4. Verify the data was inserted
SELECT 'Events' as type, COUNT(*) as count FROM events WHERE town_id = 2
UNION ALL
SELECT 'Businesses' as type, COUNT(*) as count FROM businesses WHERE town_id = 2;
