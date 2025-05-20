import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  Alert, TextInput, TouchableOpacity, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function HomeScreen({ navigation, route }) {
  const { role } = route.params;

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
        const res = await fetch('https://www.360digital.it/api/getWorkplacesApi.php');
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
    if (role !== 'admin') return setLoading(false);
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (selectedWp) params.append('workplace_filter', selectedWp);
        if (startDate)  params.append('start_date_filter', startDate.toISOString().split('T')[0]);
        if (endDate)    params.append('end_date_filter', endDate.toISOString().split('T')[0]);
        if (nameFilter) params.append('name_filter', nameFilter);

        const url = `https://www.360digital.it/api/getAttendanceApi.php?${params.toString()}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) setReports(json.data);
        else Alert.alert('API error', json.message);
      } catch (e) {
        Alert.alert('Errore rete', e.message);
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

  const extractTime = datetime => {
    if (!datetime) return '--:--';
    let timePart = datetime.includes(' ') ? datetime.split(' ')[1] : datetime;
    return timePart.substring(0,5);
  };

    // Prende per ogni dipendente il record più recente (aperto o chiuso) ordinando e poi riducendo
  const getLatestRecords = (data) => {
    // Crea una copia e calcola timestamp
    const withTs = data.map(r => {
      const tsField = r.check_out || r.check_in;
      const ts = new Date(`${r.date} ${tsField}`).getTime();
      return { ...r, __ts: ts };
    });
    // Ordina discendente per timestamp
    withTs.sort((a, b) => b.__ts - a.__ts);
    // Riduci prendendo il primo record per dipendente
    const result = [];
    const seen = new Set();
    withTs.forEach(r => {
      const key = `${r.employee_name}|${r.employee_surname}`;
      if (!seen.has(key)) {
        result.push(r);
        seen.add(key);
      }
    });
    return result;
  };

  const displayReports = role === 'admin' && !loading ? getLatestRecords(reports) : [];

  const LogoutButton = () => (
    <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.logoutBtn}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.employee_name} {item.employee_surname}</Text>
      <View style={styles.cardInfo}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>In</Text>
          <Text style={styles.infoTime}>{extractTime(item.check_in)}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Out</Text>
          <Text style={styles.infoTime}>{extractTime(item.check_out)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LogoutButton />
        <Text style={styles.title}>Benvenuto!</Text>
      </View>

      {role === 'admin' && (
        <View>
          {loadingWp ? (
            <ActivityIndicator size="small" />
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={selectedWp} onValueChange={setSelectedWp} style={styles.picker}>
                <Picker.Item label="Tutte le sedi" value="" />
                {workplaces.map(wp => (
                  <Picker.Item key={wp.id} label={wp.name} value={wp.id.toString()} />
                ))}
              </Picker>
            </View>
          )}

          <View style={styles.filtersRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => { setPickerTarget('start'); setShowPicker(true); }}>
              <Text style={styles.dateBtnText}>{startDate ? startDate.toLocaleDateString() : 'Da'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => { setPickerTarget('end'); setShowPicker(true); }}>
              <Text style={styles.dateBtnText}>{endDate ? endDate.toLocaleDateString() : 'A'}</Text>
            </TouchableOpacity>
          </View>
          <TextInput placeholder="Cerca per nome o cognome" value={nameFilter} onChangeText={setNameFilter} style={styles.searchInput} />

          {showPicker && (
            <DateTimePicker
              value={pickerTarget === 'start' ? (startDate || new Date()) : (endDate || new Date())}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}

          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <FlatList
              data={displayReports}
              keyExtractor={item => item.attendance_id.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      )}

      {role !== 'admin' && (
        <TouchableOpacity onPress={() => navigation.navigate('Stamp')} style={styles.stampBtn}>
          <Text style={styles.stampBtnText}>Timbra</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#f5f5f5', padding:16 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  logoutBtn: { backgroundColor:'#007bff', paddingVertical:6, paddingHorizontal:12, borderRadius:4 },
  logoutText: { color:'#fff', fontWeight:'bold' },
  title: { fontSize:20, fontWeight:'600' },
  pickerWrapper:{ backgroundColor:'#007bff', borderRadius:6, marginBottom:12 },
  picker:{ color:'#fff' },
  filtersRow:{ flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
  dateBtn:{ flex:1, backgroundColor:'#e0e0e0', padding:10, borderRadius:4, marginHorizontal:4 },
  dateBtnText:{ textAlign:'center' },
  searchInput:{ backgroundColor:'#fff', padding:10, borderRadius:6, marginBottom:12, borderColor:'#ddd', borderWidth:1 },
  list:{ paddingBottom:20 },
  card:{ backgroundColor:'#fff', borderRadius:8, padding:12, marginVertical:6,
    shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.1, shadowRadius:4, elevation:3
  },
  cardTitle:{ fontSize:16, fontWeight:'600', marginBottom:4 },
  cardInfo:{ flexDirection:'row', alignItems:'center' },
  infoBlock:{ flexDirection:'row', alignItems:'center', marginRight:20 },
  infoLabel:{ fontSize:14, fontWeight:'500', marginRight:4 },
  infoTime:{ fontSize:14 },
  stampBtn:{ backgroundColor:'#007bff', padding:12, borderRadius:6, alignItems:'center', marginTop:20 },
  stampBtnText:{ color:'#fff', fontWeight:'bold' }
});
