import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getSession, clearSession } from '../../constants/session';
import { apiFetch } from '../../constants/apiFetch';

type Bouquet = {
  id: number;
  name: string;
  description: string;
  base_price: string;
  occasion: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchUser();
    fetchBouquets();
  }, []);

  async function fetchUser() {
    const session = await getSession();
    if (session) setUserName(session.user_name ?? '');
  }

  async function fetchBouquets() {
    try {
      const res  = await apiFetch('/bouquets');
      const data = await res.json();
      if (res.ok) setBouquets(data);
      else Alert.alert('Error', 'Could not load bouquets');
    } catch {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await clearSession();
    router.replace('/(auth)/login');
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#B8954A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName} 👋</Text>
          <Text style={styles.subtitle}>What would you like to send?</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bouquets}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({
              pathname: '/(tabs)/bouquet',
              params: { id: item.id, name: item.name,
                        description: item.description,
                        price: item.base_price,
                        occasion: item.occasion }
            })}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardPrice}>฿{item.base_price}</Text>
            </View>
            <Text style={styles.cardDesc}>{item.description}</Text>
            <View style={styles.occasionBadge}>
              <Text style={styles.occasionText}>{item.occasion}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#FAF7F2' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F2' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#EDE6DC' },
  greeting:     { fontSize: 20, fontWeight: '500', color: '#2C2C2C' },
  subtitle:     { fontSize: 13, color: '#9A8C7E', marginTop: 2 },
  logout:       { fontSize: 13, color: '#B8954A', marginTop: 4 },
  list:         { padding: 16, gap: 12 },
  card:         { backgroundColor: '#fff', borderRadius: 12, padding: 18,
                  borderWidth: 1, borderColor: '#EDE6DC' },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardName:     { fontSize: 16, fontWeight: '500', color: '#2C2C2C' },
  cardPrice:    { fontSize: 16, fontWeight: '500', color: '#B8954A' },
  cardDesc:     { fontSize: 13, color: '#9A8C7E', lineHeight: 18, marginBottom: 10 },
  occasionBadge:{ alignSelf: 'flex-start', backgroundColor: '#FAF0E0',
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  occasionText: { fontSize: 11, color: '#B8954A', fontWeight: '500' },
});