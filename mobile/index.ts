import { registerRootComponent } from 'expo';

import App from './App';
import { initCrashReporting } from './src/crashReporting';

// قرار أنس ١٣ — قبل التركيب كي يُلتقط عطل الإقلاع نفسه؛ بلا `EXPO_PUBLIC_SENTRY_DSN` لا يفعل شيئاً.
initCrashReporting();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
