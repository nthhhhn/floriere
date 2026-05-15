// Landing — full-viewport split hero (Loewe / Bloom & Wild pattern).
//
// Desktop (md ≥ 768):
//   LEFT  : full-bleed flower photography with a serif overlay (brand poetry)
//   RIGHT : cream "paper" with eyebrow + brand + copy + CTAs, vertically centered
// Phone (< 768):
//   Single column. Brand wordmark + copy + CTAs. No left panel.
//
// Bypasses our standard <Screen> wrapper because <Screen> caps the page at
// maxFrame width — for split-hero we want full viewport edge-to-edge.

import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/Button';
import { PlaceholderImage } from '../components/PlaceholderImage';
import { space } from '../theme';

export default function Landing() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-cream">
      <View className="flex-1 flex-col lg:flex-row">

        {/* ── Left panel: TODO photo slot (desktop only) ─────────────────── */}
        <View className="hidden lg:flex lg:flex-1 lg:min-h-screen relative">
          <PlaceholderImage size="lg" fill />
        </View>

        {/* ── Right panel: cream paper with brand + CTAs ─────────────────── */}
        <ScrollView
          className="flex-1 bg-cream"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-xl lg:px-huge py-xxxl lg:py-huge justify-center items-center lg:items-start">
            <View className="w-full max-w-[440px]">

              {/* Mobile-only brand mark + photo (since left panel is hidden) */}
              <View className="lg:hidden items-center mb-xxl">
                <View style={{ width: 280, height: 280, borderRadius: 8, overflow: 'hidden' }}>
                  <PlaceholderImage size="lg" fill />
                </View>
              </View>

              <Text className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-champagne mb-md text-center lg:text-left">
                A flower-gifting house for Bangkok
              </Text>

              <View className="items-center lg:items-start mb-xl">
                <BrandMark size="md" />
              </View>

              <Text className="font-serif text-quote italic text-muted text-center lg:text-left mb-lg">
                Send something true.
              </Text>

              <Text className="font-sans text-body text-ink text-center lg:text-left mb-xxl">
                Sending flowers should feel as personal as the message they carry.
                Compose your bouquet, choose a curated arrangement, or tell us the
                moment — we'll suggest something that says it well.
              </Text>

              <Button label="Get started" onPress={() => router.push('/(auth)/register')} full />
              <View style={{ height: space.md }} />
              <Button label="I already have an account" variant="secondary" onPress={() => router.push('/(auth)/login')} full />

              <Text className="font-sans text-caption text-muted text-center lg:text-left mt-xxl">
                Bangkok metro · same-day deliveries on orders placed before 2pm
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
