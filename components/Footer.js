// components/Footer.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, Platform, Keyboard } from 'react-native';

export default function Footer() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        TIME-TRACK By Digital Security
        <Text style={styles.phone}> +39 346 946 6475</Text>
      </Text>
      <TouchableOpacity onPress={() => Linking.openURL('mailto:info@digitalesecurity.it')}>
        <Text style={styles.link}>Contatta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#007bff20',
    paddingTop: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 50 : 24,
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
  },
  text: {
    color: '#003366',
    fontSize: 14,
    textAlign: 'center',
  },
  phone: {
    fontWeight: '600',
  },
  link: {
    marginTop: 4,
    color: '#0056b3',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
});
