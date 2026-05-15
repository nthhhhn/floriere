-- Florière schema (Phase 2)
-- Drop + recreate. Run once to bootstrap.

CREATE DATABASE IF NOT EXISTS floriere
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE floriere;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS vouchers;
DROP TABLE IF EXISTS order_ratings;
DROP TABLE IF EXISTS order_messages;
DROP TABLE IF EXISTS order_events;
DROP TABLE IF EXISTS order_item_flowers;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_item_flowers;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS curated_bouquet_flowers;
DROP TABLE IF EXISTS curated_bouquets;
DROP TABLE IF EXISTS flowers;
DROP TABLE IF EXISTS recipients;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS merchants;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('purchaser','seller','admin') NOT NULL DEFAULT 'purchaser',
  phone         VARCHAR(30) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_token (token)
) ENGINE=InnoDB;

CREATE TABLE merchants (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE,
  shop_name       VARCHAR(160) NOT NULL,
  description     TEXT NULL,
  phone           VARCHAR(30) NULL,
  -- Shop open/close toggle. When closed, new orders fall back to "scheduled only."
  is_open         TINYINT(1) NOT NULL DEFAULT 1,
  open_hour       TINYINT NOT NULL DEFAULT 9,
  close_hour      TINYINT NOT NULL DEFAULT 21,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_merchants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Purchaser address book — reusable delivery addresses
CREATE TABLE addresses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  label       VARCHAR(80) NOT NULL,
  address     VARCHAR(500) NOT NULL,
  district    VARCHAR(120) NULL,
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addr_user (user_id)
) ENGINE=InnoDB;

-- Purchaser saved recipients (people they send flowers to often)
CREATE TABLE recipients (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(160) NOT NULL,
  phone       VARCHAR(30) NULL,
  relation    VARCHAR(80) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rec_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE flowers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  name        VARCHAR(120) NOT NULL,
  color       VARCHAR(40) NOT NULL,
  meaning     VARCHAR(255) NULL,
  price_thb   INT NOT NULL,
  stock       INT NOT NULL DEFAULT 0,
  illustration VARCHAR(40) NOT NULL DEFAULT 'rose',
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_flowers_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  INDEX idx_flowers_merchant (merchant_id)
) ENGINE=InnoDB;

CREATE TABLE curated_bouquets (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(160) NOT NULL,
  description    TEXT NOT NULL,
  occasion       VARCHAR(40) NOT NULL,
  base_price_thb INT NOT NULL,
  image_url      VARCHAR(500) NULL,
  active         TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE curated_bouquet_flowers (
  curated_bouquet_id INT NOT NULL,
  flower_id          INT NOT NULL,
  quantity           INT NOT NULL,
  PRIMARY KEY (curated_bouquet_id, flower_id),
  CONSTRAINT fk_cbf_bouquet FOREIGN KEY (curated_bouquet_id) REFERENCES curated_bouquets(id) ON DELETE CASCADE,
  CONSTRAINT fk_cbf_flower  FOREIGN KEY (flower_id)          REFERENCES flowers(id)          ON DELETE CASCADE
) ENGINE=InnoDB;

-- Favorites — a purchaser saves a curated bouquet to revisit
CREATE TABLE favorites (
  user_id            INT NOT NULL,
  curated_bouquet_id INT NOT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, curated_bouquet_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id)            REFERENCES users(id)            ON DELETE CASCADE,
  CONSTRAINT fk_fav_b    FOREIGN KEY (curated_bouquet_id) REFERENCES curated_bouquets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE carts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  cart_id            INT NOT NULL,
  item_type          ENUM('curated','custom','intent','concierge') NOT NULL,
  curated_bouquet_id INT NULL,
  custom_label       VARCHAR(160) NULL,
  intent_occasion    VARCHAR(60) NULL,
  intent_recipient   VARCHAR(160) NULL,
  intent_message     TEXT NULL,
  -- Concierge: durable brief from the quiz (occasion, mood_picks, palette,
  -- flower_kinds, message, format, anything_else, preview_url, label, summary).
  concierge_brief    JSON NULL,
  unit_price_thb     INT NOT NULL,
  quantity           INT NOT NULL DEFAULT 1,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_cart    FOREIGN KEY (cart_id)            REFERENCES carts(id)            ON DELETE CASCADE,
  CONSTRAINT fk_ci_curated FOREIGN KEY (curated_bouquet_id) REFERENCES curated_bouquets(id) ON DELETE SET NULL,
  INDEX idx_ci_cart (cart_id)
) ENGINE=InnoDB;

CREATE TABLE cart_item_flowers (
  cart_item_id INT NOT NULL,
  flower_id    INT NOT NULL,
  quantity     INT NOT NULL,
  PRIMARY KEY (cart_item_id, flower_id),
  CONSTRAINT fk_cif_item   FOREIGN KEY (cart_item_id) REFERENCES cart_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_cif_flower FOREIGN KEY (flower_id)    REFERENCES flowers(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Voucher / promo code system
CREATE TABLE vouchers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(40) NOT NULL UNIQUE,
  description     VARCHAR(255) NULL,
  -- Either a percentage off (1-100) or a flat baht discount; not both.
  percent_off     TINYINT NULL,
  flat_off_thb    INT NULL,
  min_subtotal    INT NOT NULL DEFAULT 0,
  active          TINYINT(1) NOT NULL DEFAULT 1,
  expires_at      DATE NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE orders (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL,
  merchant_id         INT NOT NULL,
  subtotal_thb        INT NOT NULL DEFAULT 0,
  discount_thb        INT NOT NULL DEFAULT 0,
  voucher_code        VARCHAR(40) NULL,
  total_thb           INT NOT NULL,
  delivery_date       DATE NOT NULL,
  delivery_window     VARCHAR(40) NULL,  -- 1-hour slot, e.g. "09:00–10:00", or "ASAP (1–2h)" for urgent
  delivery_mode       ENUM('scheduled','urgent') NOT NULL DEFAULT 'scheduled',
  delivery_address    VARCHAR(500) NOT NULL,
  delivery_district   VARCHAR(120) NULL,
  recipient_name      VARCHAR(160) NOT NULL,
  recipient_phone     VARCHAR(30) NULL,
  recipient_message   TEXT NULL,
  -- Concierge: snapshot of the cart's brief (image, mood tags, palette, message,
  -- format, anything_else). Copied from cart_items.concierge_brief at checkout
  -- so the order is durable even if the cart row is later deleted.
  concierge_brief     JSON NULL,
  preview_url         VARCHAR(2048) NULL,
  status              ENUM('pending','pending_review','awaiting_customer',
                           'accepted','preparing','out_for_delivery','delivered','cancelled')
                         NOT NULL DEFAULT 'pending',
  -- Cancellation request lifecycle: none (default) → requested by purchaser →
  -- approved (seller accepts, order moves to cancelled) or denied (request closed).
  cancel_request      ENUM('none','requested','approved','denied') NOT NULL DEFAULT 'none',
  cancel_reason       VARCHAR(255) NULL,
  -- ── Pass 3 additions (mocked features per deck Slide 9 reversal) ─────────
  -- Courier dispatch (mocked — not a real delivery API). Assigned when the seller
  -- flips the order to `out_for_delivery`.
  courier_name        VARCHAR(80)  NULL,
  courier_phone       VARCHAR(30)  NULL,
  courier_lat         DECIMAL(10,7) NULL,    -- origin (merchant) latitude
  courier_lng         DECIMAL(10,7) NULL,    -- origin (merchant) longitude
  dest_lat            DECIMAL(10,7) NULL,    -- destination (recipient) latitude
  dest_lng            DECIMAL(10,7) NULL,
  dispatched_at       DATETIME      NULL,
  eta_minutes         INT           NULL,    -- minutes-to-arrive at dispatch time
  -- Delivery photo (mocked — a preset URL picked by the seller on `delivered`).
  delivery_photo_url  VARCHAR(500)  NULL,
  delivery_photo_at   DATETIME      NULL,
  -- Tip the courier (mocked — no real payment).
  tip_thb             INT NOT NULL DEFAULT 0,
  tip_note            VARCHAR(255) NULL,
  tip_at              DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user     FOREIGN KEY (user_id)     REFERENCES users(id),
  CONSTRAINT fk_orders_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  INDEX idx_orders_user     (user_id),
  INDEX idx_orders_merchant (merchant_id),
  INDEX idx_orders_status   (status)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  order_id           INT NOT NULL,
  item_type          ENUM('curated','custom','intent','concierge') NOT NULL,
  curated_bouquet_id INT NULL,
  curated_name       VARCHAR(160) NULL,
  custom_label       VARCHAR(160) NULL,
  intent_occasion    VARCHAR(60) NULL,
  intent_recipient   VARCHAR(160) NULL,
  intent_message     TEXT NULL,
  unit_price_thb     INT NOT NULL,
  quantity           INT NOT NULL,
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)           REFERENCES orders(id)           ON DELETE CASCADE,
  CONSTRAINT fk_oi_curated FOREIGN KEY (curated_bouquet_id) REFERENCES curated_bouquets(id) ON DELETE SET NULL,
  INDEX idx_oi_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE order_item_flowers (
  order_item_id        INT NOT NULL,
  flower_id            INT NULL,
  name_snapshot        VARCHAR(120) NOT NULL,
  color_snapshot       VARCHAR(40)  NULL,
  unit_price_snapshot  INT NOT NULL,
  quantity             INT NOT NULL,
  PRIMARY KEY (order_item_id, name_snapshot),
  CONSTRAINT fk_oif_item   FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_oif_flower FOREIGN KEY (flower_id)     REFERENCES flowers(id)     ON DELETE SET NULL
) ENGINE=InnoDB;

-- Append-only event log — every status change writes a row.
-- Powers the live order tracker (think Grab Food).
CREATE TABLE order_events (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  event_type   ENUM('status','message','cancel_request','cancel_response','note','concierge') NOT NULL DEFAULT 'status',
  from_status  ENUM('pending','pending_review','awaiting_customer','accepted','preparing','out_for_delivery','delivered','cancelled') NULL,
  to_status    ENUM('pending','pending_review','awaiting_customer','accepted','preparing','out_for_delivery','delivered','cancelled') NULL,
  actor_id     INT NULL,
  actor_role   ENUM('purchaser','seller','admin','system') NULL,
  note         VARCHAR(500) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_oe_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oe_actor FOREIGN KEY (actor_id) REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_oe_order (order_id),
  INDEX idx_oe_created (created_at)
) ENGINE=InnoDB;

-- In-app messaging per order. Three-way: purchaser, seller, admin (+ scripted courier).
-- `channel` separates the order-level purchaser↔seller↔admin thread from the
-- purchaser↔courier mini-thread surfaced once a courier is dispatched.
CREATE TABLE order_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  sender_id   INT NULL,  -- nullable so scripted courier replies (no real user row) still log
  sender_role ENUM('purchaser','seller','admin','courier') NOT NULL,
  sender_name VARCHAR(160) NULL,    -- captured for courier (since sender_id is NULL)
  channel     ENUM('order','courier') NOT NULL DEFAULT 'order',
  body        TEXT NOT NULL,
  read_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_om_order  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_om_sender FOREIGN KEY (sender_id) REFERENCES users(id)  ON DELETE CASCADE,
  INDEX idx_om_order (order_id),
  INDEX idx_om_channel (order_id, channel),
  INDEX idx_om_created (created_at)
) ENGINE=InnoDB;

-- One rating per delivered order
CREATE TABLE order_ratings (
  order_id    INT NOT NULL PRIMARY KEY,
  stars       TINYINT NOT NULL,  -- 1..5
  comment     VARCHAR(500) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_or_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Notifications inbox — system events that should ping a user.
-- "Push notifications" are out of scope, but in-app notifications are not.
CREATE TABLE notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  kind        VARCHAR(40) NOT NULL,           -- 'order.status' | 'order.message' | 'order.cancel' | 'order.rating'
  title       VARCHAR(160) NOT NULL,
  body        VARCHAR(500) NULL,
  href        VARCHAR(255) NULL,              -- deep link inside the app
  order_id    INT NULL,
  read_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_n_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_n_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_n_user (user_id, read_at),
  INDEX idx_n_order (order_id)
) ENGINE=InnoDB;
