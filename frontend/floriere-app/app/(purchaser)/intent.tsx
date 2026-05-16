// Intent Mode — marketplace pattern.
// Occasion chip grid (flex-wrap, not horizontal scroll — only six items),
// recipient + message fields, Suggest CTA, then a hero result card with
// real photo + suggested card message.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PlaceholderImage } from '../../components/PlaceholderImage';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiGet, apiPost, apiDelete, ApiError } from '../../lib/api';
import type { Cart, IntentSuggestion } from '../../lib/types';
import { occasionLabel, thb } from '../../lib/format';
import { colors, radii, space } from '../../theme';

const OCCASIONS = ['anniversary', 'apology', 'celebration', 'sympathy', 'birthday', 'thank_you'] as const;

export default function IntentMode() {
  const router = useRouter();
  const { edit_item_id } = useLocalSearchParams<{ edit_item_id?: string }>();
  const [occasion, setOccasion] = useState<string>('anniversary');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [suggestion, setSuggestion] = useState<IntentSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function fetchSuggestion() {
    setError(null);
    setLoading(true);
    try {
      const s = await apiGet<IntentSuggestion>(`/catalog/intent?occasion=${encodeURIComponent(occasion)}`, { auth: false });
      setSuggestion(s);
      if (s.suggested_message && !message.trim()) setMessage(s.suggested_message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate a suggestion.');
    } finally {
      setLoading(false);
    }
  }

  async function addToCart() {
    if (!suggestion?.suggested_bouquet) return;
    setError(null);
    setAdding(true);
    try {
      if (edit_item_id) {
        await apiDelete(`/cart/items/${edit_item_id}`);
      }
      await apiPost<Cart>('/cart/items', {
        item_type: 'intent',
        curated_bouquet_id: suggestion.suggested_bouquet.id,
        intent_occasion: occasion,
        intent_recipient: recipient.trim() || null,
        intent_message: message.trim() || suggestion.suggested_message || null,
        quantity: 1,
      });
      router.push('/(purchaser)/cart');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add to cart.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Screen background="cream" maxFrame="tablet" back="/(purchaser)/home" backLabel="Back">
      <AppHeader eyebrow="INTENT MODE" title="Tell us the moment" />

      <Text variant="bodySm" color="muted" style={styles.intro}>
        Pick the occasion. Add a name and a message. We'll suggest a bouquet that says it well.
      </Text>

      <Text variant="caption" color="muted" style={styles.sectionLabel}>OCCASION</Text>
      <View style={styles.chipGrid}>
        {OCCASIONS.map((o) => {
          const active = o === occasion;
          return (
            <Pressable
              key={o}
              onPress={() => setOccasion(o)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text
                variant="bodySm"
                color={active ? 'champagne' : 'ink'}
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {occasionLabel(o)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" color="muted" style={styles.sectionLabel}>DETAILS</Text>
      <View style={styles.formCard}>
        <Field
          label="Recipient (optional)"
          value={recipient}
          onChangeText={setRecipient}
          placeholder="Their name — appears on the card."
        />
        <Field
          label="Card message"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          placeholder="Write your own or tap Suggest to fill from Florière's pick."
          style={{ minHeight: 88, textAlignVertical: 'top' as const } as any}
        />
      </View>

      <View style={{ height: space.md }} />
      <Button
        label={loading ? 'Thinking…' : suggestion ? 'Suggest another' : 'Suggest a bouquet'}
        onPress={fetchSuggestion}
        loading={loading}
        full
      />

      {error ? (
        <Text variant="caption" color="danger" style={{ marginTop: space.sm }}>{error}</Text>
      ) : null}

      {suggestion?.suggested_bouquet ? (
        <View style={styles.resultBlock}>
          <Text variant="caption" color="champagne" style={styles.eyebrow}>FLORIÈRE SUGGESTS</Text>

          <View style={styles.heroCard}>
            <View style={styles.heroImgWrap}>
              <PlaceholderImage
                label={suggestion.suggested_bouquet.name}
                subLabel={occasionLabel(suggestion.suggested_bouquet.occasion)}
                tone="blush"
                size="lg"
                fill
              />
              <View style={styles.occasionTag}>
                <Text variant="caption" color="white" style={styles.occasionTagText}>
                  {occasionLabel(suggestion.suggested_bouquet.occasion).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.heroBody}>
              <Text variant="h3" color="ink" numberOfLines={1}>
                {suggestion.suggested_bouquet.name}
              </Text>
              <Text variant="bodySm" color="muted" style={{ marginTop: 4 }} numberOfLines={3}>
                {suggestion.suggested_bouquet.description}
              </Text>
              <View style={styles.heroFoot}>
                <Text variant="body" color="champagne" style={{ fontWeight: '700' }}>
                  {thb(suggestion.suggested_bouquet.base_price_thb)}
                </Text>
              </View>
            </View>
          </View>

          {suggestion.suggested_message ? (
            <Card tone="creamSoft" style={styles.messageCard} flat>
              <Text variant="caption" color="champagne" style={styles.eyebrow}>SUGGESTED CARD</Text>
              <Text variant="quote" color="ink" style={{ marginTop: space.xs }}>
                "{suggestion.suggested_message}"
              </Text>
            </Card>
          ) : null}

          <View style={{ height: space.md }} />
          <Button
            label={adding ? (edit_item_id ? 'Updating…' : 'Adding to cart…') : (edit_item_id ? 'Confirm edit' : `Add to cart · ${thb(suggestion.suggested_bouquet.base_price_thb)}`)}
            onPress={addToCart}
            loading={adding}
            full
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    width: '100%',
    marginBottom: space.lg,
  },
  sectionLabel: {
    width: '100%',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 11,
    marginBottom: space.sm,
    marginTop: space.md,
  },
  eyebrow: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 11,
  },

  chipGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.md,
  },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
  chipActive: {
    backgroundColor: colors.champagneTint,
    borderColor: colors.champagne,
  },
  chipText: { fontWeight: '500' },
  chipTextActive: { fontWeight: '700' },

  formCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    padding: space.lg,
    gap: space.sm,
  },

  resultBlock: { width: '100%', marginTop: space.xl, gap: space.sm },
  heroCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    overflow: 'hidden',
    marginTop: space.sm,
  },
  heroImgWrap: {
    width: '100%',
    height: 220,
    backgroundColor: colors.creamSoft,
    position: 'relative',
  },
  heroImg:     { width: '100%', height: '100%' },
  placeholder: { borderBottomWidth: 1, borderColor: colors.creamRule },
  occasionTag: {
    position: 'absolute',
    top: space.md, left: space.md,
    backgroundColor: 'rgba(28,26,23,0.78)',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  occasionTagText: {
    letterSpacing: 1.2,
    fontSize: 10,
    fontWeight: '700',
  },
  heroBody: {
    padding: space.lg,
    gap: 2,
  },
  heroFoot: {
    marginTop: space.sm,
  },
  messageCard: {
    width: '100%',
    marginTop: space.md,
  },
});
