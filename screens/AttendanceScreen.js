// screens/AttendanceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';

export default function AttendanceScreen({ route }) {
  const { role, userId } = route.params;
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWp, setSelectedWp] = useState('');
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({ checkedIn: false, onBreak: false });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `https://www.360digital.it/api/getUserWorkplacesApi.php?user_id=${userId}`
        );
        const json = await res.json();
        console.log('RAW getUserWorkplacesApi response:', json);
        if (json.success) {
          setWorkplaces(json.data);
          if (json.data.length > 0) setSelectedWp(json.data[0].id.toString());
        } else {
          Alert.alert('Errore API', json.message);
        }
      } catch (e) {
        Alert.alert('Errore rete', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch(
        `https://www.360digital.it/api/getUserStatusApi.php?user_id=${userId}`
      );
      const json = await res.json();
      console.log('RAW getUserStatusApi response:', json);
      if (json.success) {
        setState({ checkedIn: json.checked_in, onBreak: json.on_break });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!loading) checkStatus();
  }, [loading]);

  const performAction = async (action) => {
    if (!selectedWp) {
      Alert.alert('Seleziona una sede', 'Devi scegliere la sede di lavoro.');
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permessi negati', 'Non posso ottenere la posizione');
      return;
    }
    const { coords } = await Location.getCurrentPositionAsync({});

    try {
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('action', action);
      fd.append('workplace_id', selectedWp);
      fd.append('latitude', coords.latitude);
      fd.append('longitude', coords.longitude);

      const res = await fetch(
        'https://www.360digital.it/api/userAttendanceApi.php',
        { method: 'POST', body: fd }
      );
      const json = await res.json();
      console.log('RAW userAttendanceApi response:', json);
      if (json.success) {
        Alert.alert('Successo', json.message);
        checkStatus();
      } else {
        Alert.alert('Errore', json.message);
      }
    } catch (e) {
      Alert.alert('Errore rete', e.message);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Benvenuto {role}</Text>
      {workplaces.length > 0 ? (
        <Picker
          selectedValue={selectedWp}
          onValueChange={setSelectedWp}
          style={styles.picker}
        >
          {workplaces.map(wp => (
            <Picker.Item key={wp.id} label={wp.name} value={wp.id.toString()} />
          ))}
        </Picker>
      ) : (
        <Text style={styles.noWpText}>Nessuna sede assegnata.</Text>
      )}
      <View style={styles.buttons}>
        {!state.checkedIn && (
          <TouchableOpacity style={styles.btnCheckin} onPress={() => performAction('checkin')}>
            <Text style={styles.btnText}>Check-in</Text>
          </TouchableOpacity>
        )}
        {state.checkedIn && !state.onBreak && (
          <TouchableOpacity style={styles.btnBreak} onPress={() => performAction('start_break')}>
            <Text style={styles.btnText}>Inizio Pausa</Text>
          </TouchableOpacity>
        )}
        {state.checkedIn && state.onBreak && (
          <TouchableOpacity style={styles.btnBreak} onPress={() => performAction('end_break')}>
            <Text style={styles.btnText}>Fine Pausa</Text>
          </TouchableOpacity>
        )}
        {state.checkedIn && (
          <TouchableOpacity style={styles.btnCheckout} onPress={() => performAction('checkout')}>
            <Text style={styles.btnText}>Check-out</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:20 },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  title: { fontSize:22, textAlign:'center', marginBottom:20 },
  picker: { backgroundColor:'#fff', marginBottom:20 },
  noWpText: { textAlign:'center', color:'#888', marginBottom:20 },
  buttons: { marginTop:10 },
  btnCheckin: { backgroundColor:'#28a745', padding:15, borderRadius:6, marginBottom:10 },
  btnCheckout: { backgroundColor:'#dc3545', padding:15, borderRadius:6, marginBottom:10 },
  btnBreak: { backgroundColor:'#ffc107', padding:15, borderRadius:6, marginBottom:10 },
  btnText: { color:'#fff', textAlign:'center', fontWeight:'bold' },
});
