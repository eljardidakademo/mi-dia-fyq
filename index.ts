import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { tareaWidget } from './src/widget/tarea';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// El widget del escritorio se actualiza aunque la app esté cerrada.
if (Platform.OS === 'android') registerWidgetTaskHandler(tareaWidget);
