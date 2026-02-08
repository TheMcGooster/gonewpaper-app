-- ================================================
-- SAMPLE DATA FOR DAILY LAUGHS TAB
-- ================================================
-- Run this in Supabase SQL Editor
-- ================================================

INSERT INTO comics (title, alt_text, source, publish_date, town_id)
VALUES
('Why did the scarecrow win an award?', 'Because he was outstanding in his field!', 'Daily Laughs', CURRENT_DATE, 1),
('What do you call a fake noodle?', 'An impasta!', 'Daily Laughs', CURRENT_DATE - INTERVAL '1 day', 1),
('Why don''t scientists trust atoms?', 'Because they make up everything!', 'Daily Laughs', CURRENT_DATE - INTERVAL '2 days', 1),
('What did the ocean say to the beach?', 'Nothing, it just waved.', 'Daily Laughs', CURRENT_DATE - INTERVAL '3 days', 1),
('Why did the bicycle fall over?', 'Because it was two-tired!', 'Daily Laughs', CURRENT_DATE - INTERVAL '4 days', 1),
('What do you call a bear with no teeth?', 'A gummy bear!', 'Daily Laughs', CURRENT_DATE - INTERVAL '5 days', 1),
('Why can''t you give Elsa a balloon?', 'Because she will let it go!', 'Daily Laughs', CURRENT_DATE - INTERVAL '6 days', 1);

SELECT id, title, publish_date FROM comics ORDER BY publish_date DESC;
