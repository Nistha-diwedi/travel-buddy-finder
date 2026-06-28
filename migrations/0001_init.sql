-- Travel Buddy Finder — initial schema + sample travellers
-- A user's trip is stored as a JSON string in the `trip` column (or NULL).

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phoneno     TEXT,
  age         TEXT,
  food        TEXT,
  personality TEXT,
  profilePic  TEXT,
  trip        TEXT
);

-- Sample travellers so matching returns results out of the box.
INSERT OR IGNORE INTO users (id, name, phoneno, age, food, personality, profilePic, trip) VALUES
('seed_aarav',  'Aarav Sharma', '9810011111', '24', 'Vegetarian', 'ENFJ', NULL,
 '{"startDate":"2026-07-10","endDate":"2026-07-18","source":"Delhi","destination":"Manali","budget":"15000","food":"Vegetarian","people":"4"}'),
('seed_priya',  'Priya Nair',   '9820022222', '27', 'Vegetarian', 'INFJ', NULL,
 '{"startDate":"2026-07-12","endDate":"2026-07-20","source":"Mumbai","destination":"Manali","budget":"18000","food":"Vegetarian","people":"3"}'),
('seed_rohan',  'Rohan Mehta',  '9830033333', '29', 'Non-veg',    'ESTP', NULL,
 '{"startDate":"2026-08-01","endDate":"2026-08-09","source":"Delhi","destination":"Goa","budget":"25000","food":"Non-veg","people":"6"}'),
('seed_sara',   'Sara Khan',    '9840044444', '23', 'Non-veg',    'ENFP', NULL,
 '{"startDate":"2026-08-03","endDate":"2026-08-10","source":"Pune","destination":"Goa","budget":"22000","food":"Non-veg","people":"5"}'),
('seed_vikram', 'Vikram Reddy', '9850055555', '31', 'Vegetarian', 'INTJ', NULL,
 '{"startDate":"2026-07-15","endDate":"2026-07-25","source":"Bangalore","destination":"Leh","budget":"40000","food":"Vegetarian","people":"4"}'),
('seed_neha',   'Neha Gupta',   '9860066666', '26', 'Vegetarian', 'INFP', NULL,
 '{"startDate":"2026-07-11","endDate":"2026-07-19","source":"Jaipur","destination":"Manali","budget":"16000","food":"Vegetarian","people":"2"}');
