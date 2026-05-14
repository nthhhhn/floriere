import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../constants/apiFetch';

export default function BouquetScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleOrder() {
    setLoading(true);
    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          bouquet_id:        Number(params.id),
          delivery_date:     '2026-06-01',
          delivery_address:  '123 Sukhumvit Rd, Bangkok',
          recipient_message: 'Thinking of you',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.error);
        return;
      }

      Alert.alert(
        'Order placed! 🌸',
        `Your ${params.name} is on its way.\nOrder #${data.order_id}`,
        [{ text: 'Back to home', onPress: () => router.replace('/(tabs)/home') }]
      );

    } catch {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.occasion}>{params.occasion}</Text>
        <Text style={styles.name}>{params.name}</Text>
        <Text style={styles.price}>฿{params.price}</Text>
        <Text style={styles.desc}>{params.description}</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleOrder}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Placing order...' : 'Order this bouquet'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#FAF7F2', padding: 24, paddingTop: 60 },
  back:           { marginBottom: 24 },
  backText:       { color: '#B8954A', fontSize: 15 },
  content:        { flex: 1 },
  occasion:       { fontSize: 12, color: '#B8954A', fontWeight: '500',
                    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  name:           { fontSize: 28, fontWeight: '300', color: '#2C2C2C',
                    letterSpacing: 1, marginBottom: 8 },
  price:          { fontSize: 22, color: '#B8954A', fontWeight: '500', marginBottom: 20 },
  desc:           { fontSize: 15, color: '#9A8C7E', lineHeight: 24 },
  button:         { backgroundColor: '#B8954A', borderRadius: 8,
                    padding: 18, alignItems: 'center', marginBottom: 32 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '500' },
});