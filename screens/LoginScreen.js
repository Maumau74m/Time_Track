import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';

export default function LoginScreen({ navigation }) {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ottiene lat/lon
  const getLocationAsync = async () => {
    setLoadingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permessi negati', 'Non posso ottenere la posizione');
      setLoadingLocation(false);
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLoadingLocation(false);
    return loc.coords;
  };

  const doLogin = async () => {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }
    setSubmitting(true);

    const coords = await getLocationAsync();

    let body = `email=${encodeURIComponent(email)}`
             + `&password=${encodeURIComponent(password)}`;
    if (coords) {
      body += `&latitude=${coords.latitude}&longitude=${coords.longitude}`;
    }

    try {
      const res = await fetch(
        'https://www.360digital.it/api/login_api.php',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        }
      );

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Raw login response:', text);
        Alert.alert('Errore di Parsing', 'Risposta non valida dal server');
        return;
      }

      if (data.status === 'success') {
        // Reindirizza in base al ruolo
        if (data.role === 'admin') {
          navigation.replace('Home', { role: data.role });
        } else {
          // passiamo anche l'user_id se necessario
          navigation.replace('Attendance', { userId: data.user_id, role: data.role });
        }
      } else {
        Alert.alert('Login fallito', data.message || 'Credenziali non valide');
      }

    } catch (e) {
      Alert.alert('Errore rete', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button
        title={submitting ? 'Accedi...' : loadingLocation ? 'Ottenendo posizione...' : 'Accedi'}
        onPress={doLogin}
        disabled={loadingLocation || submitting}
      />
      {(loadingLocation || submitting) && <ActivityIndicator style={{ marginTop: 12 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20 },
  title:     { fontSize:24, textAlign:'center', marginBottom:24 },
  input:     { borderWidth:1, borderColor:'#ccc', padding:10, marginBottom:16, borderRadius:4 },
});
