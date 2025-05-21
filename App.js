import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import HomeScreen   from './screens/HomeScreen';
import StampScreen  from './screens/StampScreen';
import AttendanceScreen from './screens/AttendanceScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [initialUserId, setInitialUserId] = useState(null);
  const [initialRole, setInitialRole] = useState(null);

  useEffect(() => {
    (async () => {
      const token  = await AsyncStorage.getItem('token');
      const role   = await AsyncStorage.getItem('role');
      const userId = await AsyncStorage.getItem('userId');
      if (token && role && userId) {
        setInitialUserId(userId);
        setInitialRole(role);
        setInitialRoute(role === 'admin' ? 'Home' : 'Attendance');
      } else {
        setInitialRoute('Login');
      }
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center',paddingTop: StatusBar.currentHeight||0}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown:false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          initialParams={{ userId: initialUserId, role: initialRole }}
        />
        <Stack.Screen
          name="Stamp"
          component={StampScreen}
          initialParams={{ userId: initialUserId, role: initialRole }}
        />
        <Stack.Screen
          name="Attendance"
          component={AttendanceScreen}
          initialParams={{ userId: initialUserId, role: initialRole }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
