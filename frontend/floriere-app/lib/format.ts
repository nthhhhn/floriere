export function thb(n: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '฿0';
  // U+202F NARROW NO-BREAK SPACE between symbol and figure — keeps the
  // currency glyph attached to the number and gives luxury-typography breathing.
  return `฿ ${n.toLocaleString('en-US')}`;
}

export function prettyDate(s: string): string {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function prettyDateTime(s: string): string {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/** "5 min ago" / "2 h ago" / "Yesterday" */
export function relativeTime(s: string): string {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)           return `${Math.max(1, Math.round(diff))}s ago`;
  if (diff < 3600)         return `${Math.round(diff / 60)} min ago`;
  if (diff < 86_400)       return `${Math.round(diff / 3600)} h ago`;
  if (diff < 2 * 86_400)   return 'Yesterday';
  if (diff < 7 * 86_400)   return `${Math.round(diff / 86_400)} d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function statusLabel(s: string): string {
  switch (s) {
    case 'pending':           return 'Pending';
    case 'pending_review':    return 'Florist reviewing';
    case 'awaiting_customer': return 'Awaiting your reply';
    case 'accepted':          return 'Accepted';
    case 'preparing':         return 'Preparing';
    case 'out_for_delivery':  return 'Out for delivery';
    case 'delivered':         return 'Delivered';
    case 'cancelled':         return 'Cancelled';
    default:                  return s;
  }
}

/** Short, human helper line shown under the status headline on the order page. */
export function statusHelper(s: string): string {
  switch (s) {
    case 'pending':           return 'Order placed. Florist will see it shortly.';
    case 'pending_review':    return 'Florist is checking the brief is workable.';
    case 'awaiting_customer': return 'Florist asked a question. Check chat to continue.';
    case 'accepted':          return 'Florist accepted. Materials being prepared.';
    case 'preparing':         return 'Hand-tying your bouquet at the studio now.';
    case 'out_for_delivery':  return 'Courier en route to the recipient.';
    case 'delivered':         return 'Delivered. Photo proof below.';
    case 'cancelled':         return 'Cancelled — no further action.';
    default:                  return '';
  }
}

export function occasionLabel(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

/** A rough ETA window for an out-for-delivery order, derived from delivery_date + window slot. */
export function etaSummary(deliveryDateIso: string, window?: string | null): string {
  if (!deliveryDateIso) return 'Scheduled';
  const d = new Date(deliveryDateIso);
  if (Number.isNaN(d.getTime())) return 'Scheduled';
  const today = new Date();
  const dayLabel =
    d.toDateString() === today.toDateString() ? 'today' :
    (d.getTime() - today.getTime()) < 2 * 86_400_000 ? 'tomorrow' :
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return window ? `${dayLabel} · ${window}` : dayLabel;
}

export function stars(rating: number): string {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r);
}
