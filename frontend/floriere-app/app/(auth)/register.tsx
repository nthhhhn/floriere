import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '../../constants/api';
import { saveSession } from '../../constants/session';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error);
        return;
      }
      await saveSession(data.user_id, data.name);
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Florière</Text>
      <Text style={styles.subtitle}>Create your account</Text>
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email}
        onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password}
        onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#FAF7F2' },
  title:      { fontSize: 36, fontWeight: '300', textAlign: 'center', color: '#2C2C2C', letterSpacing: 4 },
  subtitle:   { fontSize: 13, textAlign: 'center', color: '#9A8C7E', marginBottom: 48, letterSpacing: 1 },
  input:      { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E0D8', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 15 },
  button:     { backgroundColor: '#B8954A', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  link:       { textAlign: 'center', marginTop: 20, color: '#9A8C7E', fontSize: 13 },
});