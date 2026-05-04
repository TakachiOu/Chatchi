import { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.takachi.chatchi',
  appName: 'Chatchi',
  webDir: 'public',
  server: {
    url: 'https://chatchi-ik3p.onrender.com/',
    androidScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true
    }
  }
};

export default config;
