// screens/AttendanceScreen.js
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StatusBar
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Footer from '../components/Footer';

export default function AttendanceScreen({ navigation, route }) {
  const { role, userId } = route.params;
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWp, setSelectedWp] = useState('');
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({ checkedIn: false, onBreak: false });
  const [userName, setUserName] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  // Logout
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'userId', 'role']);
    navigation.replace('Login');
  };

  // Fetch user profile
  useEffect(() => {
    fetch(`https://www.360digital.it/api/getUserProfileApi.php?user_id=${userId}`)
      .then(r => r.json())
      .then(json => json.success && setUserName(`${json.data.name} ${json.data.surname}`))
      .catch(console.error);
  }, []);

  // Fetch workplaces
  useEffect(() => {
    fetch(`https://www.360digital.it/api/getUserWorkplacesApi.php?user_id=${userId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setWorkplaces(json.data);
          if (json.data.length) setSelectedWp(String(json.data[0].id));
        } else {
          Alert.alert('Errore API', json.message);
        }
      })
      .catch(e => Alert.alert('Errore rete', e.message))
      .finally(() => setLoading(false));
  }, []);

  // Check status
  const checkStatus = () => {
    fetch(`https://www.360digital.it/api/getUserStatusApi.php?user_id=${userId}`)
      .then(r => r.json())
      .then(json => json.success && setState({ checkedIn: json.checked_in, onBreak: json.on_break }))
      .catch(console.error);
  };

  useEffect(() => {
    if (!loading) checkStatus();
  }, [loading]);

  // Perform action
  const performAction = async action => {
    if (!selectedWp || actionLoading) return;
    setActionLoading(action);
    // optimistic UI
    setState(prev => {
      switch (action) {
        case 'checkin': return { ...prev, checkedIn: true };
        case 'checkout': return { checkedIn: false, onBreak: false };
        case 'start_break': return { ...prev, onBreak: true };
        case 'end_break': return { ...prev, onBreak: false };
        default: return prev;
      }
    });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Permessi negati');
      const { coords } = await Location.getCurrentPositionAsync({});
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('action', action);
      fd.append('workplace_id', selectedWp);
      fd.append('latitude', coords.latitude);
      fd.append('longitude', coords.longitude);
      const res = await fetch('https://www.360digital.it/api/userAttendanceApi.php', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Errore', json.message);
        checkStatus();
      }
    } catch (e) {
      Alert.alert('Errore', e.message);
      checkStatus();
    } finally {
      setActionLoading('');
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header at top */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Benvenuto {userName || role}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={!!actionLoading}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main content centered */}
      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Sede di Lavoro</Text>
          <Picker selectedValue={selectedWp} onValueChange={setSelectedWp} style={styles.picker}>
            {workplaces.map(wp => (
              <Picker.Item key={wp.id} label={wp.name} value={String(wp.id)} />
            ))}
          </Picker>
        </View>

        <View style={styles.actionsContainer}>
          {!state.checkedIn && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.checkinBtn]}
              onPress={() => performAction('checkin')}
              disabled={actionLoading === 'checkin'}
            >
              {actionLoading === 'checkin' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionText}>Check-in</Text>
              )}
            </TouchableOpacity>
          )}
          {state.checkedIn && !state.onBreak && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.breakBtn]}
              onPress={() => performAction('start_break')}
              disabled={actionLoading === 'start_break'}
            >
              {actionLoading === 'start_break' ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.actionText}>Inizio Pausa</Text>
              )}
            </TouchableOpacity>
          )}
          {state.checkedIn && state.onBreak && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.breakBtn]}
              onPress={() => performAction('end_break')}
              disabled={actionLoading === 'end_break'}
            >
              {actionLoading === 'end_break' ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.actionText}>Fine Pausa</Text>
              )}
            </TouchableOpacity>
          )}
          {state.checkedIn && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.checkoutBtn]}
              onPress={() => performAction('checkout')}
              disabled={actionLoading === 'checkout'}
            >
              {actionLoading === 'checkout' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionText}>Check-out</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Footer at bottom */}
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef2f3',
    paddingTop: StatusBar.currentHeight || 0,
    justifyContent: 'space-between'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  logoutBtn: { padding: 8, backgroundColor: '#007bff', borderRadius: 6 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardLabel: { fontSize: 16, marginBottom: 8 },
  picker: { backgroundColor: '#f9f9f9' },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 50,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkinBtn: { backgroundColor: '#28a745' },
  checkoutBtn: { backgroundColor: '#dc3545' },
  breakBtn: { backgroundColor: '#ffc107' },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
