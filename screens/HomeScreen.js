// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  Alert, TextInput, TouchableOpacity, Platform, SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

export default function HomeScreen({ navigation, route }) {
  const { role, userId } = route.params;

  // Filtri
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWp, setSelectedWp] = useState('');
  const [startDate, setStartDate]   = useState(null);
  const [endDate, setEndDate]       = useState(null);
  const [nameFilter, setNameFilter] = useState('');

  const [showPicker, setShowPicker]     = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  const [loadingWp, setLoadingWp] = useState(true);
  const [loading, setLoading]     = useState(true);
  const [reports, setReports]     = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `https://www.360digital.it/api/getWorkplacesApi.php?user_id=${userId}`
        );
        const json = await res.json();
        if (json.success) setWorkplaces(json.data);
      } catch (e) {
        Alert.alert('Errore rete', e.message);
      } finally {
        setLoadingWp(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (selectedWp)   params.append('workplace_filter', selectedWp);
        if (startDate)    params.append('start_date_filter', startDate.toISOString().split('T')[0]);
        if (endDate)      params.append('end_date_filter', endDate.toISOString().split('T')[0]);
        if (nameFilter)   params.append('name_filter', nameFilter);

        const url = `https://www.360digital.it/api/getAttendanceApi.php?${params.toString()}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setReports(json.data);
        } else {
          Alert.alert('API error', json.message);
          setReports([]);
        }
      } catch (e) {
        Alert.alert('Errore rete', e.message);
        setReports([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [role, selectedWp, startDate, endDate, nameFilter]);

  const onChangeDate = (event, selected) => {
    setShowPicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;
    if (pickerTarget === 'start') setStartDate(selected);
    else if (pickerTarget === 'end') setEndDate(selected);
  };

  // Estrai orario da datetime
  const extractTime = datetime => {
    if (!datetime) return '--:--';
    const timePart = datetime.includes(' ')
      ? datetime.split(' ')[1]
      : datetime;
    return timePart.substring(0,5);
  };

  const LogoutButton = () => (
    <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.logoutBtn}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {item.employee_name} {item.employee_surname} — {item.date}
      </Text>
      <View style={styles.cardInfo}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>In</Text>
          <Text style={styles.infoTime}>{extractTime(item.check_in)}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Pausa</Text>
          <Text style={styles.infoTime}>
            {item.break_start ? extractTime(item.break_start) : '--'} – {item.break_end ? extractTime(item.break_end) : '--'}
          </Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Out</Text>
          <Text style={styles.infoTime}>{extractTime(item.check_out)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestione Presenze</Text>
        <LogoutButton />
      </View>

      {role === 'admin' && (
        <>
          {!loadingWp && (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedWp}
                onValueChange={setSelectedWp}
                style={styles.picker}
                dropdownIconColor="#333"
              >
                <Picker.Item label="Tutte le sedi" value="" />
                {workplaces.map(wp => (
                  <Picker.Item key={wp.id} label={wp.name} value={wp.id.toString()} />
                ))}
              </Picker>
            </View>
          )}

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => { setPickerTarget('start'); setShowPicker(true); }}
            >
              <Text style={styles.dateBtnText}>
                {startDate ? startDate.toLocaleDateString() : 'Da'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => { setPickerTarget('end'); setShowPicker(true); }}
            >
              <Text style={styles.dateBtnText}>
                {endDate ? endDate.toLocaleDateString() : 'A'}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca per nome"
              placeholderTextColor="#666"
              value={nameFilter}
              onChangeText={setNameFilter}
            />
          </View>

          {showPicker && (
            <DateTimePicker
              value={
                pickerTarget === 'start'
                  ? (startDate || new Date())
                  : (endDate || new Date())
              }
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}

          {loading ? (
            <ActivityIndicator size="large" style={{ flex:1 }} />
          ) : (
            <FlatList
              data={reports}              // <- mostra TUTTI i record
              keyExtractor={item => item.attendance_id.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#eef2f3' },
  header: {
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    padding:16,
    backgroundColor:'#fff',
    elevation:2
  },
  title: { fontSize:20, fontWeight:'600' },
  logoutBtn:{},
  logoutText: { color:'#007bff', fontWeight:'bold' },

  pickerWrapper: {
    backgroundColor:'#fff',
    marginHorizontal:16,
    borderRadius:4,
    elevation:1,
    marginBottom:12
  },
  picker: { color:'#000' },

  filterRow: {
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal:16,
    marginBottom:12
  },
  dateBtn:{
    flex:1,
    backgroundColor:'#fff',
    padding:10,
    marginHorizontal:4,
    borderRadius:4,
    elevation:1
  },
  dateBtnText:{ color:'#000', textAlign:'center' },

  searchInput:{
    flex:1,
    backgroundColor:'#fff',
    padding:10,
    borderRadius:4,
    elevation:1,
    color:'#000'
  },

  list:{ padding:16 },
  card:{
    backgroundColor:'#fff',
    padding:12,
    borderRadius:8,
    marginBottom:12,
    elevation:1
  },
  cardTitle:{
    fontSize:16,
    fontWeight:'600',
    marginBottom:8
  },
  cardInfo:{
    flexDirection:'row',
    justifyContent:'space-between'
  },
  infoBlock:{ alignItems:'center' },
  infoLabel:{ fontSize:14, marginBottom:4 },
  infoTime:{ fontSize:14 }
});
