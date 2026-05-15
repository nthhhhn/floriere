export type Role = 'purchaser' | 'seller' | 'admin';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type Flower = {
  id: number;
  merchant_id: number;
  name: string;
  color: string;
  meaning: string | null;
  price_thb: number;
  stock: number;
  illustration: string;
  active: number;
};

export type CuratedReview = {
  stars: number;
  comment: string | null;
  reviewer_name: string;
  created_at: string | null;
};

export type CuratedBouquet = {
  id: number;
  name: string;
  description: string;
  occasion: string;
  base_price_thb: number;
  image_url: string | null;
  avg_stars?: number;
  review_count?: number;
  flowers?: Array<{
    flower_id: number;
    name: string;
    color: string;
    quantity: number;
    price_thb: number;
    illustration?: string;
  }>;
  reviews?: CuratedReview[];
};

export type ConciergeBrief = {
  occasion: string;
  occasion_text?: string;
  mood_picks: string[];
  palette_id: string | null;
  flower_kinds: string[];
  message: string;
  format: string;
  anything_else?: string;
  preview_url: string;
  preview_source?: string;
  label: string;
  summary: string;
  price_thb: number;
  best_mood_id?: string;
  tags?: { palette: string[]; vibe: string[]; shape: string[] };
};

export type CartItem = {
  id: number;
  item_type: 'curated' | 'custom' | 'intent' | 'concierge';
  curated_bouquet_id: number | null;
  curated_name: string | null;
  custom_label: string | null;
  intent_occasion: string | null;
  intent_recipient: string | null;
  intent_message: string | null;
  concierge_brief: ConciergeBrief | null;
  unit_price_thb: number;
  quantity: number;
  line_total_thb: number;
  flowers: Array<{
    flower_id: number;
    name: string;
    color: string;
    quantity: number;
    price_thb: number;
  }>;
};

export type Cart = {
  cart_id: number;
  items: CartItem[];
  subtotal_thb: number;
};

export type OrderStatus =
  | 'pending'
  | 'pending_review'
  | 'awaiting_customer'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type DeliveryMode = 'scheduled' | 'urgent';

export type CancelRequest = 'none' | 'requested' | 'approved' | 'denied';

export type Order = {
  id: number;
  user_id?: number;
  merchant_id?: number;
  subtotal_thb?: number;
  discount_thb?: number;
  voucher_code?: string | null;
  total_thb: number;
  delivery_date: string;
  delivery_window?: string | null;
  delivery_mode?: DeliveryMode;
  delivery_address: string;
  delivery_district?: string | null;
  recipient_name: string;
  recipient_phone?: string | null;
  recipient_message: string | null;
  status: OrderStatus;
  cancel_request?: CancelRequest;
  cancel_reason?: string | null;
  created_at: string;
  purchaser_name?: string;
  purchaser_email?: string;
  shop_name?: string;
  rating_stars?: number | null;
  rating_comment?: string | null;
  // Pass 3 (mocked) — courier dispatch, tip, delivery photo.
  courier_name?: string | null;
  courier_phone?: string | null;
  courier_lat?: number | null;
  courier_lng?: number | null;
  dest_lat?: number | null;
  dest_lng?: number | null;
  dispatched_at?: string | null;
  eta_minutes?: number | null;
  delivery_photo_url?: string | null;
  delivery_photo_at?: string | null;
  tip_thb?: number;
  tip_note?: string | null;
  tip_at?: string | null;
  // Concierge persisted brief + preview image (set when the order originated
  // from the guided quiz).
  concierge_brief?: ConciergeBrief | null;
  preview_url?: string | null;
  items?: Array<{
    id: number;
    item_type: 'curated' | 'custom' | 'intent' | 'concierge';
    curated_bouquet_id: number | null;
    curated_name: string | null;
    custom_label: string | null;
    intent_occasion: string | null;
    intent_recipient: string | null;
    intent_message: string | null;
    unit_price_thb: number;
    quantity: number;
    line_total_thb: number;
    flowers: Array<{
      flower_id: number;
      name: string;
      color: string;
      unit_price_thb: number;
      quantity: number;
    }>;
  }>;
};

export type IntentSuggestion = {
  occasion: string;
  matched: boolean;
  suggested_bouquet?: CuratedBouquet;
  suggested_message?: string;
  fallback?: { curated_bouquet_id: number; message: string };
};

export type OrderEvent = {
  id: number;
  event_type: 'status' | 'message' | 'cancel_request' | 'cancel_response' | 'note' | 'concierge';
  from_status: OrderStatus | null;
  to_status: OrderStatus | null;
  actor_role: 'purchaser' | 'seller' | 'admin' | 'system' | null;
  actor_name: string | null;
  note: string | null;
  created_at: string;
};

export type OrderMessage = {
  id: number;
  sender_id: number | null;
  sender_role: 'purchaser' | 'seller' | 'admin' | 'courier';
  sender_name: string;
  channel?: 'order' | 'courier';
  body: string;
  read_at: string | null;
  created_at: string;
};

export type CourierInfo = {
  courier_name: string | null;
  courier_phone: string | null;
  origin: { lat: number | null; lng: number | null };
  destination: { lat: number | null; lng: number | null };
  dispatched_at: string | null;
  eta_minutes: number | null;
  progress: number;
  remaining_minutes: number | null;
  status: OrderStatus;
};

export type Notification = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  order_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type Address = {
  id: number;
  label: string;
  address: string;
  district: string | null;
  is_default: number;
  created_at: string | null;
};

export type Recipient = {
  id: number;
  name: string;
  phone: string | null;
  relation: string | null;
  created_at: string | null;
};

export type Voucher = {
  id: number;
  code: string;
  description: string | null;
  percent_off: number | null;
  flat_off_thb: number | null;
  min_subtotal: number;
  active: number;
  expires_at: string | null;
  created_at: string | null;
};

export type VoucherPreview =
  | { valid: true; code: string; description: string | null; discount_thb: number; total_thb: number }
  | { valid: false; error: string };

export type MerchantPublic = {
  id: number;
  shop_name: string;
  description: string | null;
  phone?: string | null;
  is_open: number;
  open_hour: number;
  close_hour: number;
  avg_stars?: number;
  review_count?: number;
};

export type SellerTipStats = {
  week_thb: number;
  week_count: number;
  total_thb: number;
  total_count: number;
};

export type SellerRating = {
  order_id: number;
  stars: number;
  comment: string | null;
  reviewer_name: string;
  created_at: string | null;
};
