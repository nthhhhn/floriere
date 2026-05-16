// Concierge — guided bouquet quiz.
//
// Replaces the old DIY canvas. Seven steps:
//   0. Occasion             — 14 presets + free-text "Other"
//   1. Mood (pick 3)        — Spotify-style "which of these feel right"
//   2. Palette              — colour mood (18 options)
//   3. Specific flowers     — optional, skippable
//   4. Message + format     — card / wrap stamp / silk ribbon / none
//   5. Anything else        — free-text note for the florist
//   6. Result               — POST /concierge/generate → preview + Add to cart
//
// Live image generation tries Gemini 2.5 Flash Image first (paid; currently
// 429 on free tier) then falls back to Pollinations.ai (free) and finally a
// tag-similarity stub. The frontend renders preview_url regardless of source.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import { PlaceholderImage, toneFromColor } from '../../components/PlaceholderImage';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiGet, apiPost, apiDelete, ApiError } from '../../lib/api';
import {
  FORMATS,
  MOOD_REFS,
  OCCASIONS,
  OCCASION_LABEL,
  PALETTES,
  SUGGESTED_PHRASES,
  type FormatId,
  type Occasion,
  type PaletteId,
} from '../../lib/imagery';
import { useBreakpoint } from '../../lib/responsive';
import type { Cart, Flower } from '../../lib/types';
import { thb } from '../../lib/format';
import { colors, radii, space } from '../../theme';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ConciergeResult = {
  preview_url: string;
  preview_source: string;
  label: string;
  summary: string;
  tags: { palette: string[]; vibe: string[]; shape: string[] };
  price_thb: number;
  suggested_curated: {
    id: number;
    name: string;
    description: string;
    base_price_thb: number;
    image_url: string;
  } | null;
  best_mood_id: string;
  message: string;
  format: FormatId;
  format_label: string;
};

const STEP_LABELS = ['Occasion', 'Mood', 'Palette', 'Flowers', 'Message', 'Notes', 'Preview'] as const;

// Free-text hints offered on the "Anything else" step.
const NOTE_HINTS = [
  'No strong scents — hospital recipient.',
  'Building has no elevator, leave at lobby.',
  'They love eucalyptus, please feature it.',
  'Recipient has cat allergies.',
  'Tie it tight — they like a compact hand-bouquet.',
];

export default function Concierge() {
  const router = useRouter();
  const { edit_item_id } = useLocalSearchParams<{ edit_item_id?: string }>();
  const bp = useBreakpoint();
  const isPhone = bp === 'phone';

  // ─── State ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(0);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [moodPicks, setMoodPicks] = useState<string[]>([]);
  const [palette, setPalette] = useState<PaletteId | null>(null);
  const [flowerKinds, setFlowerKinds] = useState<string[]>([]);
  const [format, setFormat] = useState<FormatId>('card');
  const [message, setMessage] = useState('');
  const [anythingElse, setAnythingElse] = useState('');
  const [otherOccasion, setOtherOccasion] = useState('');

  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConciergeResult | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingFromSummary, setEditingFromSummary] = useState(false);

  useEffect(() => {
    if (edit_item_id) {
      apiGet<{items: any[]}>('/cart').then((res) => {
        const item = res.items.find((i) => i.id === Number(edit_item_id));
        if (item && item.concierge_brief) {
          const b = item.concierge_brief;
          setOccasion(b.occasion || null);
          setOtherOccasion(b.occasion_text || '');
          setMoodPicks(b.mood_picks || []);
          setPalette(b.palette_id || null);
          setFlowerKinds(b.flower_kinds || []);
          setMessage(b.message || '');
          setFormat(b.format || 'card');
          setAnythingElse(b.anything_else || '');
          setStep(7);
        }
      }).catch(console.error);
    }
  }, [edit_item_id]);

  useEffect(() => {
    apiGet<Flower[]>('/catalog/flowers', { auth: false })
      .then(setFlowers)
      .catch(() => setFlowers([]));
  }, []);

  // Flowers by unique illustration kind — one tile per kind.
  const flowerKindOptions = useMemo(() => {
    const byKind = new Map<string, Flower>();
    for (const f of flowers) {
      if (!byKind.has(f.illustration)) byKind.set(f.illustration, f);
    }
    return Array.from(byKind.values());
  }, [flowers]);

  // ─── Step navigation ──────────────────────────────────────────────────
  function canAdvance(s: Step): boolean {
    if (s === 0) {
      if (!occasion) return false;
      // "Other" requires a typed value before continuing.
      if (occasion === ('other' as Occasion) && !otherOccasion.trim()) return false;
      return true;
    }
    if (s === 1) return moodPicks.length === 3;
    if (s === 2) return palette !== null;
    if (s === 3) return true; // flowers optional
    if (s === 4) return true; // message optional
    if (s === 5) return true; // anything-else optional
    return false;
  }

  function next() {
    if (editingFromSummary) {
      setStep(7);
      setEditingFromSummary(false);
      return;
    }
    if (step === 5) {
      // Last input step → fire generate then go to preview.
      generate();
      return;
    }
    setStep((s) => Math.min(6, s + 1) as Step);
  }

  function back() {
    if (editingFromSummary) {
      setStep(7);
      setEditingFromSummary(false);
      return;
    }
    if (step === 0 || step === 7) {
      router.back();
    } else {
      setStep((s) => Math.max(0, s - 1) as Step);
    }
  }

  function toggleMood(id: string) {
    setMoodPicks((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 3) return cur;
      return [...cur, id];
    });
  }

  function toggleFlower(kind: string) {
    setFlowerKinds((cur) =>
      cur.includes(kind) ? cur.filter((x) => x !== kind) : [...cur, kind],
    );
  }

  async function generate() {
    if (!occasion) return;
    setError(null);
    setPreviewBroken(false);
    setPreviewLoading(true);
    setLoading(true);
    setStep(6);
    try {
      const res = await apiPost<ConciergeResult>('/concierge/generate', {
        occasion,
        occasion_text: occasion === ('other' as Occasion) ? otherOccasion.trim() : null,
        mood_picks:    moodPicks,
        palette_id:    palette,
        flower_kinds:  flowerKinds,
        format,
        message:       message.trim(),
        anything_else: anythingElse.trim(),
      }, { auth: false });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate your bouquet.');
    } finally {
      setLoading(false);
    }
  }

  async function addToCart() {
    if (!result || !occasion) return;
    setAdding(true);
    setError(null);
    try {
      // Optional flower-kind hints — included so the merchant can see which
      // stems were requested. Brief is the authoritative price source.
      const pickedFlowerIds = flowerKinds.length
        ? flowerKinds
            .map((k) => flowers.find((f) => f.illustration === k))
            .filter(Boolean)
            .map((f) => ({ flower_id: f!.id, quantity: 3 }))
        : [];

      const occasionLabel = occasion === ('other' as Occasion)
        ? (otherOccasion.trim() || 'Other')
        : OCCASION_LABEL[occasion];

      const brief = {
        occasion,
        occasion_text: occasion === ('other' as Occasion) ? otherOccasion.trim() : null,
        mood_picks:    moodPicks,
        palette_id:    palette,
        flower_kinds:  flowerKinds,
        message:       result.message ?? message.trim(),
        format:        result.format,
        anything_else: anythingElse.trim() || null,
        preview_url:   result.preview_url,
        label:         result.label,
        summary:       result.summary,
        price_thb:     result.price_thb,
        best_mood_id:  result.best_mood_id,
        tags:          result.tags,
        preview_source: result.preview_source,
      };

      if (edit_item_id) {
        await apiDelete(`/cart/items/${edit_item_id}`);
      }
      await apiPost<Cart>('/cart/items', {
        item_type:       'concierge',
        custom_label:    `Concierge · ${occasionLabel} · ${result.label}`,
        flowers:         pickedFlowerIds,
        concierge_brief: brief,
        quantity:        1,
      });
      router.push('/(purchaser)/cart');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add to cart.');
    } finally {
      setAdding(false);
    }
  }

  function reset() {
    setStep(0);
    setOccasion(null);
    setOtherOccasion('');
    setMoodPicks([]);
    setPalette(null);
    setFlowerKinds([]);
    setFormat('card');
    setMessage('');
    setAnythingElse('');
    setResult(null);
    setError(null);
  }

  function skipStep() {
    next();
  }

  const fmt = FORMATS.find((f) => f.id === format)!;
  const phrases = occasion ? SUGGESTED_PHRASES[occasion] : [];
  const messageOver = fmt.maxChars > 0 && message.length > fmt.maxChars;

  return (
    <Screen background="cream" maxFrame="tablet">
      {/* Header strip — Start over on top-right */}
      <View style={[styles.headerNav, { justifyContent: 'flex-end' }]}>
        {step > 0 && step < 6 ? (
          <Pressable onPress={reset} style={styles.clearChip}>
            <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>Start over</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="champagne" style={styles.eyebrow}>CONCIERGE</Text>
          <Text variant="h2" color="ink" style={{ marginTop: 2 }}>
            {step < 6 ? 'Tell us what to send' : 'Your bouquet'}
          </Text>
          <Text variant="bodySm" color="muted" style={{ marginTop: 4 }}>
            {step < 6
              ? 'A few questions. We compose a bouquet for you at the end.'
              : 'Shaped from your picks. Tap to start over or add to cart.'}
          </Text>
        </View>
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {STEP_LABELS.slice(0, 7).map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <Pressable key={label} style={styles.stepSegment} onPress={() => {
              if (i === step) return;
              if (i === 6) {
                if (occasion) generate();
              } else {
                setStep(i as Step);
              }
            }}>
              <View style={[
                styles.stepDot,
                done && styles.stepDotDone,
                active && styles.stepDotActive,
              ]} />
              {!isPhone ? (
                <Text
                  variant="caption"
                  color={active ? 'champagne' : done ? 'ink' : 'muted'}
                  style={{ marginTop: 4, fontWeight: active ? '700' : '500' }}
                >
                  {label}
                </Text>
              ) : null}
              {i < 6 ? (
                <View style={[styles.stepLine, done && styles.stepLineDone]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* ─── Step 0: Occasion ───────────────────────────────── */}
      {step === 0 ? (
        <View style={styles.stepWrap}>
          <Text variant="h3" color="ink" style={styles.stepTitle}>What is this for?</Text>
          <Text variant="bodySm" color="muted" style={styles.stepHint}>
            Tap the moment closest to yours. Pick Other to type your own.
          </Text>
          <View style={styles.chipGrid}>
            {OCCASIONS.map((o) => {
              const active = o === occasion;
              return (
                  <Pressable
                    key={o}
                    onPress={() => {
                      setOccasion(o);
                      if (o !== 'other') {
                        setTimeout(next, 150);
                      }
                    }}
                    style={active ? [styles.occChip, styles.occChipActive] : styles.occChip}
                  >
                  <Text
                    variant="body"
                    color={active ? 'champagne' : 'ink'}
                    style={{ fontWeight: active ? '700' : '500' }}
                  >
                    {OCCASION_LABEL[o]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {occasion === ('other' as Occasion) ? (
            <View style={styles.otherBox}>
              <Text variant="caption" color="muted" style={styles.eyebrow}>YOUR OCCASION</Text>
              <TextInput
                style={styles.otherInput as any}
                value={otherOccasion}
                onChangeText={setOtherOccasion}
                placeholder="e.g. promotion, retirement, name day…"
                placeholderTextColor={colors.muted}
                maxLength={60}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => { if (canAdvance(0)) next(); }}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ─── Step 1: Mood (pick 3) ──────────────────────────── */}
      {step === 1 ? (
        <View style={styles.stepWrap}>
          <View style={styles.stepHeadRow}>
            <View style={{ flex: 1 }}>
              <Text variant="h3" color="ink" style={styles.stepTitle}>Pick three you like</Text>
              <Text variant="bodySm" color="muted" style={styles.stepHint}>
                Don't overthink it — we'll find your match.
              </Text>
            </View>
            <View style={styles.countPill}>
              <Text variant="caption" color="champagne" style={{ fontWeight: '700' }}>
                {moodPicks.length} / 3
              </Text>
            </View>
          </View>
          <View style={styles.moodGrid}>
            {MOOD_REFS.map((m) => {
              const picked = moodPicks.includes(m.id);
              const order  = picked ? moodPicks.indexOf(m.id) + 1 : 0;
              const dim    = !picked && moodPicks.length >= 3;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => toggleMood(m.id)}
                  style={[
                    styles.moodCard,
                    picked && styles.moodCardPicked,
                    dim && styles.moodCardDim,
                  ]}
                >
                  <View style={styles.moodImg}>
                    <PlaceholderImage
                      label={m.name}
                      subLabel={m.tags.vibe[0]}
                      tone={
                        m.tags.palette.includes('warm')  ? 'blush'  :
                        m.tags.palette.includes('vivid') ? 'red'    :
                        m.tags.palette.includes('cool')  ? 'sage'   :
                        m.tags.palette.includes('white') ? 'cream'  :
                        m.tags.palette.includes('earth') ? 'earth'  :
                        m.tags.palette.includes('pastel') ? 'pink'  :
                        'neutral'
                      }
                      size="md"
                      fill
                    />
                  </View>
                  {picked ? (
                    <View style={styles.moodBadge}>
                      <Text variant="caption" color="white" style={styles.moodBadgeText}>{order}</Text>
                    </View>
                  ) : null}
                  <View style={styles.moodCap}>
                    <Text variant="bodySm" color="ink" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text variant="caption" color="muted" numberOfLines={2}>
                      {m.blurb}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* ─── Step 2: Palette ────────────────────────────────── */}
      {step === 2 ? (
        <View style={styles.stepWrap}>
          <Text variant="h3" color="ink" style={styles.stepTitle}>Choose a colour mood</Text>
          <Text variant="bodySm" color="muted" style={styles.stepHint}>
            We'll bias toward this palette in the final composition.
          </Text>
          <View style={styles.paletteGrid}>
            {PALETTES.map((p) => {
              const active = p.id === palette;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPalette(p.id)}
                  style={active ? [styles.paletteTile, styles.paletteTileActive] : styles.paletteTile}
                >
                  <View style={styles.swatchRow}>
                    {p.swatches.map((hex, i) => (
                      <View key={i} style={[styles.swatch, { backgroundColor: hex }]} />
                    ))}
                  </View>
                  <Text variant="body" color="ink" style={{ fontWeight: active ? '700' : '600', marginTop: space.sm }}>
                    {p.label}
                  </Text>
                  <Text variant="caption" color="muted">{p.blurb}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* ─── Step 3: Specific flowers (optional) ────────────── */}
      {step === 3 ? (
        <View style={styles.stepWrap}>
          <View style={styles.stepHeadRow}>
            <View style={{ flex: 1 }}>
              <Text variant="h3" color="ink" style={styles.stepTitle}>Any flowers in particular?</Text>
              <Text variant="bodySm" color="muted" style={styles.stepHint}>
                Skip if you trust us — we read the rest from your picks.
              </Text>
            </View>
            {flowerKinds.length > 0 ? (
              <Pressable onPress={() => setFlowerKinds([])} style={styles.clearChip}>
                <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Prominent Skip → then divider → then options */}
          <Pressable onPress={skipStep} style={styles.skipBtn}>
            <Text variant="body" color="champagne" style={{ fontWeight: '700' }}>
              Skip — let the florist choose →
            </Text>
          </Pressable>
          <View style={styles.skipDivider}>
            <View style={styles.dividerLine} />
            <Text variant="caption" color="muted" style={styles.dividerText}>OR PICK YOUR FAVOURITES</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.flowerGrid}>
            {flowerKindOptions.map((f) => {
              const active = flowerKinds.includes(f.illustration);
              return (
                <Pressable
                  key={f.illustration}
                  onPress={() => toggleFlower(f.illustration)}
                  style={[styles.flowerTile, active && styles.flowerTilePicked]}
                >
                  <View style={styles.flowerImg}>
                    <PlaceholderImage label={f.name} subLabel={f.color} tone={toneFromColor(f.color)} size="sm" fill />
                  </View>
                  <View style={styles.flowerCap}>
                    <Text variant="bodySm" color="ink" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {f.name}
                    </Text>
                  </View>
                  {active ? (
                    <View style={styles.tick}>
                      <Text variant="caption" color="white" style={styles.tickText}>✓</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* ─── Step 4: Message + format ───────────────────────── */}
      {step === 4 ? (
        <View style={styles.stepWrap}>
          <Text variant="h3" color="ink" style={styles.stepTitle}>How should the message land?</Text>
          <Text variant="bodySm" color="muted" style={styles.stepHint}>
            Card, stamp, ribbon — or nothing at all.
          </Text>

          <View style={styles.fmtRow}>
            {FORMATS.map((f) => {
              const active = f.id === format;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFormat(f.id)}
                  style={active ? [styles.fmtCard, styles.fmtCardActive] : styles.fmtCard}
                >
                  <View style={styles.fmtImg}>
                    <PlaceholderImage
                      label={f.label}
                      subLabel={f.id.replace('_', ' ')}
                      tone={f.id === 'none' ? 'neutral' : f.id === 'ribbon' ? 'cream' : f.id === 'wrap_stamp' ? 'earth' : 'blush'}
                      size="sm"
                      fill
                    />
                  </View>
                  <View style={{ padding: space.sm }}>
                    <Text variant="bodySm" color="ink" style={{ fontWeight: active ? '700' : '600' }}>
                      {f.label}
                    </Text>
                    <Text variant="caption" color="muted" numberOfLines={2}>
                      {f.blurb}
                    </Text>
                    {f.maxChars > 0 ? (
                      <Text variant="caption" color="champagne" style={{ marginTop: 4 }}>
                        Up to {f.maxChars} chars · +{thb(f.priceAddThb)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {fmt.maxChars > 0 ? (
            <>
              <Text variant="caption" color="muted" style={[styles.eyebrow, { marginTop: space.lg }]}>
                YOUR MESSAGE
              </Text>
              <View style={styles.msgWrap}>
                <TextInput
                  style={styles.msgInput as any}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  placeholder={phrases[0] ?? 'Write something true.'}
                  placeholderTextColor={colors.muted}
                  maxLength={fmt.maxChars + 80 /* allow over-typing, flag in counter */}
                />
                <View style={styles.msgFootRow}>
                  <Text variant="caption" color={messageOver ? 'danger' : 'muted'}>
                    {message.length} / {fmt.maxChars}
                  </Text>
                </View>
              </View>

              {phrases.length > 0 ? (
                <>
                  <Text variant="caption" color="muted" style={[styles.eyebrow, { marginTop: space.md }]}>
                    SUGGESTED
                  </Text>
                  <View style={styles.phraseRow}>
                    {phrases.map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setMessage(p)}
                        style={styles.phraseChip}
                      >
                        <Text variant="caption" color="ink" numberOfLines={2}>{p}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <View style={styles.noMsgBox}>
              <Text variant="body" color="muted" align="center">
                No message. The bouquet speaks alone.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* ─── Step 5: Anything else ──────────────────────────── */}
      {step === 5 ? (
        <View style={styles.stepWrap}>
          <Text variant="h3" color="ink" style={styles.stepTitle}>Anything else we should know?</Text>
          <Text variant="bodySm" color="muted" style={styles.stepHint}>
            Allergies, building quirks, recipient preferences — anything the
            florist should hear before they pick stems. Optional.
          </Text>

          {/* Prominent Skip → divider → input */}
          <Pressable onPress={skipStep} style={styles.skipBtn}>
            <Text variant="body" color="champagne" style={{ fontWeight: '700' }}>
              Skip — nothing more to add →
            </Text>
          </Pressable>
          <View style={styles.skipDivider}>
            <View style={styles.dividerLine} />
            <Text variant="caption" color="muted" style={styles.dividerText}>OR WRITE A NOTE</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.noteWrap}>
            <TextInput
              style={styles.noteInput as any}
              multiline
              value={anythingElse}
              onChangeText={setAnythingElse}
              placeholder={NOTE_HINTS[0]}
              placeholderTextColor={colors.muted}
              maxLength={400}
            />
            <View style={styles.msgFootRow}>
              <Text variant="caption" color="muted">
                {anythingElse.length} / 400
              </Text>
            </View>
          </View>

          <Text variant="caption" color="muted" style={[styles.eyebrow, { marginTop: space.md }]}>
            COMMON NOTES
          </Text>
          <View style={styles.phraseRow}>
            {NOTE_HINTS.map((p) => (
              <Pressable key={p} onPress={() => setAnythingElse(p)} style={styles.phraseChip}>
                <Text variant="caption" color="ink" numberOfLines={2}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* ─── Step 6: Result ─────────────────────────────────── */}
      {step === 6 ? (
        <View style={styles.stepWrap}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.champagne} size="large" />
              <Text variant="h3" color="ink" align="center" style={{ marginTop: space.lg }}>
                Composing your bouquet…
              </Text>
              <Text variant="bodySm" color="muted" align="center" style={{ marginTop: space.xs }}>
                Reading your picks. This takes a moment.
              </Text>
            </View>
          ) : error ? (
            <View style={styles.loadingBox}>
              <Text variant="h3" color="danger" align="center">Something went wrong.</Text>
              <Text variant="bodySm" color="muted" align="center" style={{ marginTop: space.xs }}>
                {error}
              </Text>
              <View style={{ marginTop: space.lg }}>
                <Button label="Try again" onPress={generate} />
              </View>
            </View>
          ) : result ? (
            <>
              <View style={styles.previewWrap}>
                <View style={styles.previewImg}>
                  {/* PlaceholderImage as backdrop — visible while the AI image
                      loads, and remains visible if loading fails. */}
                  <PlaceholderImage
                    label={result.label}
                    subLabel={occasion ? OCCASION_LABEL[occasion] : 'Concierge'}
                    tone={
                      palette === 'noir' || palette === 'midnight' || palette === 'monsoon' ? 'cool' :
                      palette === 'ember' || palette === 'sunset' || palette === 'temple' ? 'red' :
                      palette === 'sage' || palette === 'jade' ? 'sage' :
                      palette === 'butter' || palette === 'spring' ? 'yellow' :
                      palette === 'lavender' || palette === 'lilac' ? 'purple' :
                      palette === 'ocean' ? 'blue' :
                      palette === 'terracotta' ? 'earth' :
                      'blush'
                    }
                    size="lg"
                    fill
                  />
                  {result.preview_url && !previewBroken ? (
                    <Image
                      source={{ uri: result.preview_url }}
                      style={StyleSheet.absoluteFill as any}
                      resizeMode="cover"
                      onLoadStart={() => setPreviewLoading(true)}
                      onLoadEnd={() => setPreviewLoading(false)}
                      onError={() => { setPreviewBroken(true); setPreviewLoading(false); }}
                    />
                  ) : null}
                  {previewLoading && result.preview_url && !previewBroken ? (
                    <View style={styles.previewLoading}>
                      <ActivityIndicator color={colors.champagne} size="large" />
                      <Text variant="caption" color="muted" style={{ marginTop: 8, fontWeight: '600', letterSpacing: 1 }}>
                        RENDERING — 10–20s
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.previewBadgeRow}>
                  <View style={styles.previewBadge}>
                    <Text variant="caption" color="muted" style={{ fontWeight: '700' }}>
                      {previewBroken || !result.preview_url
                        ? 'PLACEHOLDER — IMAGE UNAVAILABLE'
                        : `AI PREVIEW · ${(result.preview_source || 'stub').split(':')[0].toUpperCase()}`}
                    </Text>
                  </View>
                </View>
              </View>

              <Text variant="caption" color="champagne" style={[styles.eyebrow, { marginTop: space.md }]}>
                {occasion === ('other' as Occasion)
                  ? (otherOccasion.trim() || 'Concierge')
                  : occasion ? OCCASION_LABEL[occasion] : 'Concierge'}
              </Text>
              <Text variant="h2" color="ink" style={{ marginTop: 2 }}>{result.label}</Text>
              <Text variant="body" color="muted" style={{ marginTop: 4 }}>
                {result.summary}
              </Text>

              {result.message ? (
                <View style={styles.msgCard}>
                  <Text variant="caption" color="muted" style={styles.eyebrow}>
                    ON THE {result.format_label.toUpperCase()}
                  </Text>
                  <Text variant="quote" color="ink" style={{ marginTop: space.xs }}>
                    "{result.message}"
                  </Text>
                </View>
              ) : null}

              {result.suggested_curated ? (
                <View style={styles.suggCard}>
                  <View style={styles.suggThumb}>
                    <PlaceholderImage label={result.suggested_curated.name} tone="blush" size="sm" fill />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color="muted" style={styles.eyebrow}>CLOSEST CURATED</Text>
                    <Text variant="body" color="ink" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {result.suggested_curated.name}
                    </Text>
                    <Text variant="caption" color="muted" numberOfLines={2}>
                      {result.suggested_curated.description}
                    </Text>
                    <Pressable
                      onPress={() => router.push(`/(purchaser)/curated/${result.suggested_curated!.id}` as any)}
                      style={styles.suggBtn}
                    >
                      <Text variant="caption" color="champagne" style={{ fontWeight: '700' }}>
                        View {thb(result.suggested_curated.base_price_thb)} →
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.priceCard}>
                <View>
                  <Text variant="caption" color="muted" style={styles.eyebrow}>YOUR BOUQUET</Text>
                  <Text variant="h2" color="ink">{thb(result.price_thb)}</Text>
                </View>
                <Pressable onPress={reset} style={styles.againChip}>
                  <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>Start over</Text>
                </Pressable>
              </View>

              <View style={{ height: space.md }} />
              <Button
                label={adding ? (edit_item_id ? 'Updating…' : 'Adding to cart…') : (edit_item_id ? 'Confirm changes' : `Add to cart · ${thb(result.price_thb)}`)}
                onPress={addToCart}
                loading={adding}
                full
              />
            </>
          ) : null}
        </View>
      ) : null}

            {step === 7 ? (
        <View style={{ width: '100%' }}>
          <Text variant="h3" color="ink" style={{ marginTop: space.xl, marginBottom: space.lg }}>Review your selections</Text>
          <View style={{ backgroundColor: colors.white, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderHair, padding: space.lg }}>
            {/* Occasion */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="muted">OCCASION</Text>
                <Text variant="body" color="ink" style={{ marginTop: 2 }}>{occasion === 'other' ? otherOccasion : occasion ? OCCASION_LABEL[occasion] : 'None'}</Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => { setStep(0); setEditingFromSummary(true); }} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.creamRule, marginVertical: space.md }} />

            {/* Mood */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="muted">MOOD</Text>
                <Text variant="body" color="ink" style={{ marginTop: 2 }}>{moodPicks.length > 0 ? moodPicks.join(', ') : 'None'}</Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => { setStep(1); setEditingFromSummary(true); }} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.creamRule, marginVertical: space.md }} />

            {/* Palette */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="muted">PALETTE</Text>
                <Text variant="body" color="ink" style={{ marginTop: 2 }}>{palette ? palette : 'None'}</Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => { setStep(2); setEditingFromSummary(true); }} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.creamRule, marginVertical: space.md }} />

            {/* Flowers */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="muted">FLOWERS</Text>
                <Text variant="body" color="ink" style={{ marginTop: 2 }}>{flowerKinds.length > 0 ? flowerKinds.join(', ') : 'No preference'}</Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => { setStep(3); setEditingFromSummary(true); }} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.creamRule, marginVertical: space.md }} />

            {/* Message */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="muted">MESSAGE & FORMAT</Text>
                <Text variant="body" color="ink" style={{ marginTop: 2 }}>{message ? `"${message}"` : 'No message'}</Text>
                <Text variant="caption" color="champagne" style={{ marginTop: 2 }}>{FORMATS.find(f => f.id === format)?.label}</Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => { setStep(4); setEditingFromSummary(true); }} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.creamRule, marginVertical: space.md }} />

            {/* Notes */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="muted">NOTES</Text>
                <Text variant="body" color="ink" style={{ marginTop: 2 }}>{anythingElse ? anythingElse : 'None'}</Text>
              </View>
              <Button label="Edit" variant="ghost" size="sm" onPress={() => { setStep(5); setEditingFromSummary(true); }} />
            </View>
          </View>
          
          <View style={{ marginTop: space.xl, marginBottom: space.xxl }}>
            <Button 
              label="Preview & Save changes" 
              onPress={generate}
              loading={loading}
              full
            />
          </View>
        </View>
      ) : null}

      {/* ─── Bottom nav (steps 0-6 only) ─────────────────────── */}
      {step < 7 ? (
        <View style={styles.navRow}>
          <Pressable
            onPress={back}
            style={styles.navBtn}
          >
            <Text variant="body" color="ink" style={{ fontWeight: '600' }}>
              ← Back
            </Text>
          </Pressable>
          {step === 0 && occasion !== 'other' ? null : step === 6 ? null : (
            <Pressable
              onPress={next}
              disabled={!canAdvance(step) || messageOver}
              style={(!canAdvance(step) || messageOver)
                ? [styles.navBtnPrimary, styles.navBtnPrimaryDisabled]
                : styles.navBtnPrimary}
            >
              <Text variant="body" color="cream" style={{ fontWeight: '700' }}>
                {editingFromSummary ? 'Confirm' : step === 5 ? 'Generate →' : 'Next →'}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Top nav row — back arrow (left) + start-over (right). Always visible at
  // the top of the page so the user can rewind without scrolling.
  headerNav: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.md,
  },
  backBtn: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },
  backBtnDisabled: { opacity: 0.35 },

  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  eyebrow: { letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' },
  clearChip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },

  // Optional-step Skip row + divider
  skipBtn: {
    width: '100%',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.champagne,
    backgroundColor: colors.champagneTint,
    alignItems: 'center',
    marginBottom: space.md,
  },
  skipDivider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginVertical: space.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.creamRule,
  },
  dividerText: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    fontSize: 10,
  },

  // Other-occasion input
  otherBox: {
    width: '100%',
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.champagne,
    backgroundColor: colors.white,
  },
  otherInput: {
    width: '100%',
    marginTop: space.xs,
    paddingVertical: space.sm,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamRule,
  },

  // ── Step indicator ────────────────────────────────────────────────────
  stepBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: space.lg,
    paddingHorizontal: space.xs,
  },
  stepSegment: { flex: 1, alignItems: 'center', position: 'relative' },
  stepDot: {
    width: 14, height: 14,
    borderRadius: 7,
    backgroundColor: colors.creamRule,
    borderWidth: 2,
    borderColor: colors.creamRule,
  },
  stepDotDone:   { backgroundColor: colors.champagne, borderColor: colors.champagne },
  stepDotActive: { backgroundColor: colors.cream, borderColor: colors.champagne, transform: [{ scale: 1.2 }] },
  stepLine: {
    position: 'absolute',
    top: 6, left: '50%', right: '-50%',
    height: 2,
    backgroundColor: colors.creamRule,
    zIndex: -1,
  },
  stepLineDone: { backgroundColor: colors.champagne },

  // ── Step content wrap ─────────────────────────────────────────────────
  stepWrap: { width: '100%', paddingBottom: space.xl },
  stepHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    width: '100%',
  },
  stepTitle: { marginBottom: space.xs },
  stepHint:  { marginBottom: space.lg },
  countPill: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.champagne,
    backgroundColor: colors.champagneTint,
  },

  // ── Step 0: Occasion ──────────────────────────────────────────────────
  chipGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  occChip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },
  occChipActive: {
    borderColor: colors.champagne,
    backgroundColor: colors.champagneTint,
  },

  // ── Step 1: Mood ─────────────────────────────────────────────────────
  moodGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  moodCard: {
    width: '31%',
    minWidth: 150,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    overflow: 'hidden',
    position: 'relative',
  },
  moodCardPicked: {
    borderColor: colors.champagne,
    borderWidth: 2,
  },
  moodCardDim:    { opacity: 0.45 },
  moodImg:        { width: '100%', height: 140, backgroundColor: colors.creamSoft },
  moodCap:        { padding: space.sm },
  moodBadge: {
    position: 'absolute',
    top: 8, right: 8,
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: colors.champagne,
    alignItems: 'center', justifyContent: 'center',
  },
  moodBadgeText: { fontSize: 12, fontWeight: '700' },

  // ── Step 2: Palette ──────────────────────────────────────────────────
  paletteGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  paletteTile: {
    width: '47%',
    padding: space.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
  paletteTileActive: {
    borderColor: colors.champagne,
    backgroundColor: colors.champagneTint,
  },
  swatchRow: { flexDirection: 'row', gap: 6 },
  swatch:    { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.creamRule },

  // ── Step 3: Flowers ──────────────────────────────────────────────────
  flowerGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  flowerTile: {
    width: '30%',
    minWidth: 130,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    overflow: 'hidden',
    position: 'relative',
  },
  flowerTilePicked: { borderColor: colors.champagne, borderWidth: 2 },
  flowerImg:        { width: '100%', height: 110, backgroundColor: colors.creamSoft },
  flowerCap:        { padding: space.sm },
  tick: {
    position: 'absolute',
    top: 8, right: 8,
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: colors.champagne,
    alignItems: 'center', justifyContent: 'center',
  },
  tickText: { fontSize: 12, fontWeight: '700' },

  // ── Step 4: Message + format ─────────────────────────────────────────
  fmtRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  fmtCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    overflow: 'hidden',
  },
  fmtCardActive: { borderColor: colors.champagne, borderWidth: 2 },
  fmtImg:        { width: '100%', height: 100, backgroundColor: colors.creamSoft },
  msgWrap: {
    width: '100%',
    marginTop: space.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
    padding: space.md,
  },
  msgInput: {
    width: '100%',
    minHeight: 80,
    fontSize: 16,
    color: colors.ink,
    fontFamily: 'serif',
    lineHeight: 22,
  },
  msgFootRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: space.xs,
  },
  phraseRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.xs,
  },
  phraseChip: {
    maxWidth: '100%',
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },
  noMsgBox: {
    width: '100%',
    paddingVertical: space.xxl,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.creamSoft,
    marginTop: space.md,
  },

  // ── Step 5: Anything else ────────────────────────────────────────────
  noteWrap: {
    width: '100%',
    marginTop: space.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
    padding: space.md,
  },
  noteInput: {
    width: '100%',
    minHeight: 100,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },

  // ── Step 5: Result ───────────────────────────────────────────────────
  loadingBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxxl,
  },
  previewWrap: {
    width: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    overflow: 'hidden',
    backgroundColor: colors.white,
    position: 'relative',
  },
  previewImg: { width: '100%', height: 400, backgroundColor: colors.creamSoft, position: 'relative', overflow: 'hidden' },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,238,230,0.72)',  // cream wash so spinner reads on any backdrop
  },
  previewBadgeRow: {
    position: 'absolute',
    top: space.md, left: space.md,
    flexDirection: 'row',
    gap: space.xs,
  },
  previewBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  msgCard: {
    width: '100%',
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },
  suggCard: {
    width: '100%',
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.creamSoft,
  },
  suggThumb: { width: 76, height: 76, borderRadius: radii.sm, backgroundColor: colors.creamSoft },
  suggBtn:   { marginTop: space.xs, alignSelf: 'flex-start' },

  priceCard: {
    width: '100%',
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.champagne,
    backgroundColor: colors.champagneTint,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  againChip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.champagne,
    backgroundColor: colors.white,
  },

  // ── Bottom nav ────────────────────────────────────────────────────────
  navRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.lg,
    paddingBottom: space.lg,
  },
  navBtn: {
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnPrimary: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
  },
  navBtnPrimaryDisabled: { opacity: 0.35 },
});
