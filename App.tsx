import React, {useState} from 'react';
import NativeFlashlight from './specs/NativeFlashlight';
import './global.css';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Transmit from './views/Transmit';
import Receive from './views/Receive';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StyleSheet} from 'react-native';

function App(): React.JSX.Element {
  const Stack = createNativeStackNavigator();
  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Transmit"
            component={Transmit}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Receive"
            component={Receive}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
