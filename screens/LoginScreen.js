// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { decode as atob } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Footer from '../components/Footer';

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stayLogged, setStayLogged]   = useState(false);

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
        // manual JWT decode
        const parts = data.token.split('.');
        if (parts.length !== 3) throw new Error('Token JWT non valido');
        const payload = JSON.parse(atob(parts[1]));
        const userId = payload.data.user_id;

        // manage stay logged
        if (stayLogged) {
          await AsyncStorage.multiSet([
            ['token', data.token],
            ['userId', userId.toString()],
            ['role', data.role]
          ]);
        } else {
          await AsyncStorage.multiRemove(['token','userId','role']);
        }

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.form}>
          <Text style={styles.title}>Login</Text>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />

          <View style={styles.switchRow}>
            <Switch
              value={stayLogged}
              onValueChange={setStayLogged}
              trackColor={{ false: '#bbb', true: '#007bff' }}
              thumbColor={stayLogged ? '#fff' : '#fff'}
            />
            <Text style={styles.switchLabel}>Rimani connesso</Text>
          </View>

          <Button
            title={
              submitting
                ? 'Accedi...'
                : loadingLocation
                  ? 'Ottenendo posizione...'
                  : 'Accedi'
            }
            onPress={doLogin}
            disabled={loadingLocation || submitting}
            color="#007bff"
          />
          {(loadingLocation || submitting) && (
            <ActivityIndicator style={{ marginTop: 12 }} />
          )}

          <TouchableOpacity
            onPress={() => Linking.openURL('https://www.360digital.it/includes/anagrafica/forgot_password.php')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Hai dimenticato la password?</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Footer */}
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef2f3',
    paddingTop: StatusBar.currentHeight || 0,
    justifyContent: 'flex-start'
  },
  container: {
    flex:1,
    justifyContent: 'flex-start'
  },
  logo: {
    width: 120,
    height: 120,
    marginTop: 40,
    alignSelf: 'center'
  },
  form: {
    marginTop: 20,
    paddingHorizontal: 20
  },
  title:     { fontSize:24, marginBottom:16, color:'#333', textAlign:'center' },
  input:     {
    borderWidth:1,
    borderColor:'#ccc',
    padding:10,
    marginBottom:12,
    borderRadius:4,
    backgroundColor:'#fff',
    color: '#000'
  },
  switchRow: { flexDirection:'row', alignItems:'center', marginBottom:16 },
  switchLabel: { marginLeft:8, fontSize:16, color:'#333' },
  forgotLink: { marginTop: 16, alignSelf: 'center' },
  forgotText: { color: '#007bff', textDecorationLine: 'underline' }
});
