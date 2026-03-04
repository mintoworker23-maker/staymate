import '@expo/metro-runtime';

import { App } from 'expo-router/build/qualified-entry';
import { AppRegistry, Platform } from 'react-native';

AppRegistry.registerComponent('main', () => App);

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const rootTag = document.getElementById('root');
  AppRegistry.runApplication('main', {
    rootTag,
    hydrate: globalThis.__EXPO_ROUTER_HYDRATE__,
  });
}
