// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { decode as atob } from 'base-64';

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getLocationAsync = async () => {
    setLoadingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLoadingLocation(false);
    if (status !== 'granted') {
      Alert.alert('Permessi negati', 'Non posso ottenere la posizione');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({});
    return loc.coords;
  };

  const doLogin = async () => {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }
    setSubmitting(true);
    const coords = await getLocationAsync();

    let body = `email=${encodeURIComponent(email)}` +
               `&password=${encodeURIComponent(password)}`;
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
      console.log('RAW login response:', text);
      const data = JSON.parse(text);

      if (data.status === 'success') {
        // ===== manual JWT decode =====
        const parts = data.token.split('.');
        if (parts.length !== 3) throw new Error('Token JWT non valido');
        const payload = JSON.parse(atob(parts[1]));
        const userId = payload.data.user_id;
        // =============================

        if (data.role === 'admin') {
          navigation.replace('Home',  { role: data.role, userId });
        } else {
          navigation.replace('Attendance', { role: data.role, userId });
        }
      } else {
        Alert.alert('Login fallito', data.message || 'Credenziali non valide');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Errore rete o parsing', e.message);
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
        title={submitting 
                ? 'Accedi...' 
                : loadingLocation 
                  ? 'Ottenendo posizione...' 
                  : 'Accedi'}
        onPress={doLogin}
        disabled={loadingLocation || submitting}
      />
      {(loadingLocation || submitting) && (
        <ActivityIndicator style={{ marginTop: 12 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20 },
  title:     { fontSize:24, textAlign:'center', marginBottom:24 },
  input:     { borderWidth:1, borderColor:'#ccc', padding:10,
               marginBottom:16, borderRadius:4 }
});
