import React, { useState } from 'react';
import {
  View, Text, Button, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';

export default function StampScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const doStamp = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permessi negati', 'Non posso ottenere la posizione');
      setLoading(false);
      return;
    }
    const { coords } = await Location.getCurrentPositionAsync({});
    try {
      const res = await fetch(
        'https://www.360digital.it/api/stamp_api.php',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `latitude=${coords.latitude}&longitude=${coords.longitude}`
        }
      );
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.status === 'success') {
        Alert.alert('Timbratura OK', data.message || 'Registrato con successo');
        navigation.goBack();
      } else {
        Alert.alert('Errore timbratura', data.message || 'Riprova più tardi');
      }
    } catch (e) {
      Alert.alert('Errore rete', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registra Presenza</Text>
      <Button
        title={loading ? 'Invio...' : 'Timbratura'}
        onPress={doStamp}
        disabled={loading}
      />
      {loading && <ActivityIndicator style={{ marginTop:12 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20 },
  title:     { fontSize:22, textAlign:'center', marginBottom:24 },
});
