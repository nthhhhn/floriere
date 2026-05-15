-- Florière seed data (Phase 2 demo)
-- Passwords: see README.md. Hashes generated with werkzeug.security.generate_password_hash (pbkdf2:sha256).
-- If you want to regenerate hashes from scratch, run: python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('admin123'))"

USE floriere;

-- Clear in dependency order
DELETE FROM notifications;
DELETE FROM vouchers;
DELETE FROM order_ratings;
DELETE FROM order_messages;
DELETE FROM order_events;
DELETE FROM order_item_flowers;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_item_flowers;
DELETE FROM cart_items;
DELETE FROM carts;
DELETE FROM favorites;
DELETE FROM curated_bouquet_flowers;
DELETE FROM curated_bouquets;
DELETE FROM flowers;
DELETE FROM recipients;
DELETE FROM addresses;
DELETE FROM merchants;
DELETE FROM sessions;
DELETE FROM users;
ALTER TABLE users             AUTO_INCREMENT = 1;
ALTER TABLE merchants         AUTO_INCREMENT = 1;
ALTER TABLE addresses         AUTO_INCREMENT = 1;
ALTER TABLE recipients        AUTO_INCREMENT = 1;
ALTER TABLE flowers           AUTO_INCREMENT = 1;
ALTER TABLE curated_bouquets  AUTO_INCREMENT = 1;
ALTER TABLE carts             AUTO_INCREMENT = 1;
ALTER TABLE cart_items        AUTO_INCREMENT = 1;
ALTER TABLE orders            AUTO_INCREMENT = 1;
ALTER TABLE order_items       AUTO_INCREMENT = 1;
ALTER TABLE order_events      AUTO_INCREMENT = 1;
ALTER TABLE order_messages    AUTO_INCREMENT = 1;
ALTER TABLE vouchers          AUTO_INCREMENT = 1;
ALTER TABLE notifications     AUTO_INCREMENT = 1;

-- ── users ─────────────────────────────────────────────────
-- These password hashes are produced from the run-once helper backend/scripts/init_db.py.
-- For static seed we use placeholders that init_db.py will overwrite. If you import this
-- file by itself with `mysql < seed.sql`, then run `python scripts/init_db.py --rehash`
-- to write real hashes for the demo accounts.

INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
  (1, 'Pete',                 'pete@floriere.test',     'CHANGE_ME', 'purchaser', '+66800000001'),
  (2, 'Floriste de Sukhumvit','merchant@floriere.test', 'CHANGE_ME', 'seller',    '+66800000002'),
  (3, 'Florière Admin',       'admin@floriere.test',    'CHANGE_ME', 'admin',     '+66800000003');

-- ── merchant ─────────────────────────────────────────────
INSERT INTO merchants (id, user_id, shop_name, description, phone, is_open, open_hour, close_hour) VALUES
  (1, 2, 'Floriste de Sukhumvit',
   'Boutique studio florist on Sukhumvit 31. Florière''s exclusive V1 supplier. Hand-tied compositions, same-day if ordered before 2pm.',
   '+66 2 555 0131', 1, 9, 21);

-- ── purchaser address book + saved recipients (so the demo shows the feature) ─
INSERT INTO addresses (user_id, label, address, district, is_default) VALUES
  (1, 'Home',   'Park 24 Condo, Sukhumvit 24, Bangkok 10110', 'Khlong Toei', 1),
  (1, 'Office', '1 Empire Tower, South Sathorn Rd., Bangkok 10120', 'Sathorn', 0);

INSERT INTO recipients (user_id, name, phone, relation) VALUES
  (1, 'Mali',  '+66811112222', 'partner'),
  (1, 'Khun Mae', '+66833334444', 'mother');

-- ── flower stems ─────────────────────────────────────────
-- `illustration` is a key the frontend maps to a placeholder tile colour.
-- Stems are sourced wholesale from Pak Khlong Talat — Bangkok's flower market.
INSERT INTO flowers (id, merchant_id, name, color, meaning, price_thb, stock, illustration, active) VALUES
  -- core nine (locked ids for existing curated joins)
  (1,  1, 'Rose',          'red',     'Love and passion',          85,  120, 'rose',         1),
  (2,  1, 'Rose',          'white',   'Reverence and beginnings',  80,   80, 'rose',         1),
  (3,  1, 'Tulip',         'pink',    'Care and affection',        60,  100, 'tulip',        1),
  (4,  1, 'Tulip',         'yellow',  'Cheerful thoughts',         55,   90, 'tulip',        1),
  (5,  1, 'Lily',          'white',   'Purity and elegance',      120,   40, 'lily',         1),
  (6,  1, 'Sunflower',     'yellow',  'Warmth and happiness',      70,   60, 'sunflower',    1),
  (7,  1, 'Peony',         'blush',   'Romance, prosperity',      180,   30, 'peony',        1),
  (8,  1, 'Eucalyptus',    'green',   'Healing, calm (greenery)',  35,  200, 'eucalyptus',   1),
  (9,  1, 'Baby''s Breath','white',   'Lasting love (filler)',     25,  200, 'babys_breath', 1),

  -- extended catalog
  (10, 1, 'Rose',          'pink',    'Gentle affection',          80,   90, 'rose',         1),
  (11, 1, 'Tulip',         'red',     'True love',                 60,   70, 'tulip',        1),
  (12, 1, 'Tulip',         'white',   'Forgiveness, clarity',      55,   60, 'tulip',        1),
  (13, 1, 'Lily',          'pink',    'Compassion, admiration',   120,   30, 'lily',         1),
  (14, 1, 'Orchid',        'purple',  'Luxury and refinement',    150,   45, 'orchid',       1),
  (15, 1, 'Orchid',        'white',   'Reverence and beauty',     140,   40, 'orchid',       1),
  (16, 1, 'Gerbera',       'red',     'Cheerfulness, vitality',    50,   80, 'gerbera',      1),
  (17, 1, 'Gerbera',       'pink',    'Joyful gratitude',          50,   80, 'gerbera',      1),
  (18, 1, 'Gerbera',       'yellow',  'Sunny encouragement',       50,   80, 'gerbera',      1),
  (19, 1, 'Gerbera',       'orange',  'Energy, warmth',            50,   80, 'gerbera',      1),
  (20, 1, 'Daisy',         'white',   'Innocence, simplicity',     30,  150, 'daisy',        1),
  (21, 1, 'Daisy',         'yellow',  'Friendship, cheer',         30,  150, 'daisy',        1),
  (22, 1, 'Ranunculus',    'pink',    'Charm and attraction',      70,   60, 'ranunculus',   1),
  (23, 1, 'Ranunculus',    'white',   'Tender thoughts',           70,   55, 'ranunculus',   1),
  (24, 1, 'Hydrangea',     'blue',    'Gratitude, abundance',     110,   40, 'hydrangea',    1),
  (25, 1, 'Hydrangea',     'pink',    'Heartfelt emotion',        110,   40, 'hydrangea',    1),
  (26, 1, 'Hydrangea',     'white',   'Apology, grace',           110,   35, 'hydrangea',    1),
  (27, 1, 'Chrysanthemum', 'yellow',  'Long life, fidelity',       45,   90, 'chrysanthemum',1),
  (28, 1, 'Chrysanthemum', 'white',   'Loyalty, truth',            45,   80, 'chrysanthemum',1),
  (29, 1, 'Dahlia',        'red',     'Dignity, strength',         80,   50, 'dahlia',       1),
  (30, 1, 'Dahlia',        'pink',    'Elegance, kindness',        80,   50, 'dahlia',       1),
  (31, 1, 'Carnation',     'red',     'Deep love',                 35,  120, 'carnation',    1),
  (32, 1, 'Carnation',     'pink',    'A mother''s love',          35,  120, 'carnation',    1),
  (33, 1, 'Carnation',     'white',   'Pure, untroubled love',     35,  120, 'carnation',    1),
  (34, 1, 'Hyacinth',      'purple',  'Sincerity, prayer',         55,   60, 'hyacinth',     1),
  (35, 1, 'Hyacinth',      'blue',    'Calm, constancy',           55,   60, 'hyacinth',     1),

  -- ── Thai market favourites ──
  (36, 1, 'Marigold',      'orange',  'Devotion, offering',        20,  250, 'marigold',     1),
  (37, 1, 'Marigold',      'yellow',  'Bright remembrance',        20,  250, 'marigold',     1),
  (38, 1, 'Jasmine',       'white',   'Purity, motherly love',     30,  200, 'jasmine',      1),
  (39, 1, 'Lotus',         'pink',    'Awakening, devotion',       40,  120, 'lotus',        1),
  (40, 1, 'Lotus',         'white',   'Spiritual clarity',         40,  120, 'lotus',        1),
  (41, 1, 'Bougainvillea', 'pink',    'Vibrancy, welcome',         25,  150, 'bougainvillea',1),
  (42, 1, 'Frangipani',    'white',   'Devotion, beauty',          35,  100, 'frangipani',   1),
  (43, 1, 'Frangipani',    'yellow',  'Gentle warmth',             35,  100, 'frangipani',   1);

-- ── curated bouquets ─────────────────────────────────────
-- image_url hot-links Unsplash via `images.unsplash.com/photo-<id>` (CDN, no API key, free for
-- demo). `source.unsplash.com/featured/?q=...` was deprecated Oct 2024 and returns 503 — these
-- direct photo IDs are stable. To swap, find an Unsplash URL and copy the `photo-<id>` slug.
INSERT INTO curated_bouquets (id, name, description, occasion, base_price_thb, image_url, active) VALUES
  (1,  'Garden Romance',   'A soft, curated mix for anniversaries — blush peony, white roses, eucalyptus.',          'anniversary',  1290,
       'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1200&q=80', 1),
  (2,  'Apology in Bloom', 'Gentle whites and pinks — says sorry better than words.',                                'apology',       990,
       'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=1200&q=80', 1),
  (3,  'Celebration',      'Bold and joyful — sunflowers, yellow tulips, baby''s breath.',                           'celebration',   890,
       'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=1200&q=80', 1),
  (4,  'Stillness',        'A quiet arrangement led by white lilies — for sympathy.',                                'sympathy',     1190,
       'https://images.unsplash.com/photo-1565011523534-747a8601f10a?auto=format&fit=crop&w=1200&q=80', 1),
  (5,  'Birthday Wishes',  'Sunny gerberas with a sunflower core — a candle in flower form.',                        'birthday',      790,
       'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=1200&q=80', 1),
  (6,  'With Gratitude',   'Pink roses and white ranunculus — quiet thanks, deeply meant.',                          'thank_you',     890,
       'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1200&q=80', 1),
  (7,  'Get Well Soon',    'Yellow tulips and white daisies — light, hopeful, get-up-and-go.',                       'get_well',      780,
       'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=1200&q=80', 1),
  (8,  'Graduation Day',   'Sunflower-led, with white roses and yellow mums — bright start, no fear.',               'graduation',    990,
       'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=1200&q=80', 1),
  (9,  'Wedding White',    'A ceremonial all-white — roses, lilies, ranunculus on baby''s breath cloud.',            'wedding',      1490,
       'https://images.unsplash.com/photo-1565011523534-747a8601f10a?auto=format&fit=crop&w=1200&q=80', 1),
  (10, 'New Arrival',      'Soft pinks and whites — for the smallest hello.',                                        'newborn',       990,
       'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=1200&q=80', 1),
  (11, 'Home Sweet Home',  'Marigold + frangipani + eucalyptus — Thai welcome, warm front door.',                    'housewarming',  690,
       'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1200&q=80', 1),
  (12, 'Bangkok Bloom',    'Marigold garland energy with jasmine and bougainvillea — Pak Khlong Talat in a vase.',   'celebration',   590,
       'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=1200&q=80', 1);

INSERT INTO curated_bouquet_flowers (curated_bouquet_id, flower_id, quantity) VALUES
  -- 1 Garden Romance: blush peony × 3, white rose × 5, eucalyptus × 4, baby's breath × 3
  (1, 7, 3), (1, 2, 5), (1, 8, 4), (1, 9, 3),
  -- 2 Apology in Bloom: white rose × 6, pink tulip × 4, baby's breath × 4
  (2, 2, 6), (2, 3, 4), (2, 9, 4),
  -- 3 Celebration: sunflower × 5, yellow tulip × 5, baby's breath × 3
  (3, 6, 5), (3, 4, 5), (3, 9, 3),
  -- 4 Stillness: white lily × 4, eucalyptus × 5, baby's breath × 3
  (4, 5, 4), (4, 8, 5), (4, 9, 3),
  -- 5 Birthday Wishes: yellow sunflower × 3, yellow gerbera × 3, orange gerbera × 2, baby's breath × 3
  (5, 6, 3), (5, 18, 3), (5, 19, 2), (5, 9, 3),
  -- 6 With Gratitude: pink rose × 6, white ranunculus × 4, eucalyptus × 3
  (6, 10, 6), (6, 23, 4), (6, 8, 3),
  -- 7 Get Well Soon: yellow tulip × 5, white daisy × 5, eucalyptus × 4
  (7, 4, 5), (7, 20, 5), (7, 8, 4),
  -- 8 Graduation Day: yellow sunflower × 4, white rose × 4, yellow chrysanthemum × 3, eucalyptus × 3
  (8, 6, 4), (8, 2, 4), (8, 27, 3), (8, 8, 3),
  -- 9 Wedding White: white rose × 8, white lily × 3, white ranunculus × 4, baby's breath × 4
  (9, 2, 8), (9, 5, 3), (9, 23, 4), (9, 9, 4),
  -- 10 New Arrival: pink tulip × 4, white daisy × 5, pink hydrangea × 2, baby's breath × 3
  (10, 3, 4), (10, 20, 5), (10, 25, 2), (10, 9, 3),
  -- 11 Home Sweet Home: orange marigold × 6, yellow gerbera × 3, eucalyptus × 4, white frangipani × 3
  (11, 36, 6), (11, 18, 3), (11, 8, 4), (11, 42, 3),
  -- 12 Bangkok Bloom: orange marigold × 8, yellow marigold × 6, white jasmine × 6, pink bougainvillea × 4
  (12, 36, 8), (12, 37, 6), (12, 38, 6), (12, 41, 4);

-- One favorite to show the heart-state in the demo
INSERT INTO favorites (user_id, curated_bouquet_id) VALUES (1, 1);

-- ── vouchers ─────────────────────────────────────────────
INSERT INTO vouchers (code, description, percent_off, flat_off_thb, min_subtotal, active) VALUES
  ('WELCOME10',  '10% off your first Florière order',           10,   NULL,    0, 1),
  ('STUDIO200',  '฿200 off any bouquet over ฿1,000',          NULL,   200, 1000, 1),
  ('GRADER25',   '25% off — for the App Dev grader',            25,   NULL,    0, 1);

-- ── carts (purchaser starts with empty cart) ─────────────
INSERT INTO carts (id, user_id) VALUES (1, 1);

-- ── demo order already out-for-delivery (Pass 3) ─────────
-- Seeds a live courier + ETA so the demo video can show the map immediately
-- without waiting for the seller to advance an order through every stage.
INSERT INTO orders (
  id, user_id, merchant_id,
  subtotal_thb, discount_thb, voucher_code, total_thb,
  delivery_date, delivery_window, delivery_address, delivery_district,
  recipient_name, recipient_phone, recipient_message, status,
  courier_name, courier_phone,
  courier_lat, courier_lng, dest_lat, dest_lng,
  dispatched_at, eta_minutes
) VALUES (
  1001, 1, 1,
  1290, 0, NULL, 1290,
  CURDATE(), '14:00–15:00',
  'Park 24 Condo, Sukhumvit 24, Bangkok 10110', 'Khlong Toei',
  'Mali', '+66811112222',
  'For another year of you.',
  'out_for_delivery',
  'Khun Nat', '+66 89 555 0142',
  13.7411820, 100.5670400,    -- Sukhumvit 31, Bangkok-ish (origin)
  13.7268000, 100.5694000,    -- Phra Khanong / Sukhumvit 24 (destination)
  DATE_SUB(NOW(), INTERVAL 4 MINUTE),
  18
);

-- One order_item for the demo order so it has substance
INSERT INTO order_items (
  id, order_id, item_type, curated_bouquet_id, curated_name,
  unit_price_thb, quantity
) VALUES (
  1001, 1001, 'curated', 1, 'Garden Romance', 1290, 1
);

-- Demo concierge order (pending_review) so grader sees the brief panel and
-- merchant action bar without going through the quiz first.
INSERT INTO orders (
  id, user_id, merchant_id,
  subtotal_thb, discount_thb, voucher_code, total_thb,
  delivery_date, delivery_window, delivery_mode,
  delivery_address, delivery_district,
  recipient_name, recipient_phone, recipient_message,
  concierge_brief, preview_url, status
) VALUES (
  1003, 1, 1,
  1290, 0, NULL, 1290,
  DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00–15:00', 'scheduled',
  'Soi 49, Sukhumvit Rd, Bangkok 10110', 'Watthana',
  'Praew', '+66833334444',
  'For another year of you.',
  JSON_OBJECT(
    'occasion',      'anniversary',
    'mood_picks',    JSON_ARRAY('m-cottage','m-blush','m-petal'),
    'palette_id',    'blush',
    'flower_kinds',  JSON_ARRAY('rose','peony'),
    'message',       'For another year of you.',
    'format',        'card',
    'anything_else', 'Recipient lives on the 8th floor, no concierge — call on arrival.',
    'preview_url',   'https://images.unsplash.com/photo-1565181917578-7180a32f8a7d?auto=format&fit=crop&w=900&q=80',
    'label',         'Blush peony · blush',
    'summary',       'Vibe: romantic, luxe · Palette: pastel, warm · Shape: tight',
    'price_thb',     1290,
    'best_mood_id',  'm-blush'
  ),
  'https://images.unsplash.com/photo-1565181917578-7180a32f8a7d?auto=format&fit=crop&w=900&q=80',
  'pending_review'
);

INSERT INTO order_items (id, order_id, item_type, custom_label, unit_price_thb, quantity)
VALUES (1003, 1003, 'concierge', 'Concierge · Anniversary · Blush peony · blush', 1290, 1);

INSERT INTO order_item_flowers (order_item_id, flower_id, name_snapshot, color_snapshot, unit_price_snapshot, quantity) VALUES
  (1003, 7, 'Peony', 'blush',  180, 3),
  (1003, 1, 'Rose',  'pink',    80, 5);

INSERT INTO order_events (order_id, event_type, to_status, actor_id, actor_role, note, created_at) VALUES
  (1003, 'status', 'pending_review', 1, 'purchaser', 'Concierge brief submitted', DATE_SUB(NOW(), INTERVAL 6 MINUTE));

INSERT INTO notifications (user_id, kind, title, body, href, order_id, created_at) VALUES
  (2, 'order.status', 'Concierge brief — please review',
   'For Praew · scheduled · 14:00–15:00',
   '/(seller)/orders/1003', 1003,
   DATE_SUB(NOW(), INTERVAL 6 MINUTE));

INSERT INTO order_item_flowers (order_item_id, flower_id, name_snapshot, color_snapshot, unit_price_snapshot, quantity) VALUES
  (1001, 7, 'Peony',         'blush',  180, 3),
  (1001, 2, 'Rose',          'white',   80, 5),
  (1001, 8, 'Eucalyptus',    'green',   35, 4),
  (1001, 9, 'Baby''s Breath','white',   25, 3);

-- Timeline rows for the demo order so the tracker shows full history
INSERT INTO order_events (order_id, event_type, to_status, actor_id, actor_role, note, created_at) VALUES
  (1001, 'status', 'pending',          1, 'purchaser', 'Order placed',        DATE_SUB(NOW(), INTERVAL 32 MINUTE)),
  (1001, 'status', 'accepted',         2, 'seller',    'Accepted by studio',  DATE_SUB(NOW(), INTERVAL 28 MINUTE)),
  (1001, 'status', 'preparing',        2, 'seller',    'Hand-tying bouquet',  DATE_SUB(NOW(), INTERVAL 18 MINUTE)),
  (1001, 'status', 'out_for_delivery', 2, 'seller',    'Courier dispatched',  DATE_SUB(NOW(), INTERVAL 4  MINUTE));

-- Pre-scripted courier opener so the chat thread isn't blank
INSERT INTO order_messages (order_id, sender_id, sender_role, sender_name, channel, body, created_at) VALUES
  (1001, NULL, 'courier', 'Khun Nat', 'courier',
   'Hi! I have your Florière bouquet — heading to Sukhumvit 24 now.',
   DATE_SUB(NOW(), INTERVAL 3 MINUTE));

-- Seed notification for the courier dispatch
INSERT INTO notifications (user_id, kind, title, body, href, order_id, created_at) VALUES
  (1, 'order.status', 'Your order is on the way',
   'Khun Nat is heading to Sukhumvit 24 — arriving in about 18 min.',
   '/(purchaser)/orders/1001', 1001,
   DATE_SUB(NOW(), INTERVAL 4 MINUTE));

ALTER TABLE orders        AUTO_INCREMENT = 1004;
ALTER TABLE order_items   AUTO_INCREMENT = 1004;
