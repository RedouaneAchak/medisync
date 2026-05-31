import { Capacitor } from '@capacitor/core';

const apiHost = Capacitor.getPlatform() === 'android' ? '10.0.2.2' : 'localhost';

export const environment = {
  production: false,
  // For Android emulator, 10.0.2.2 points to the host machine.
  // If you run on a physical device, replace this with your machine LAN IP.
  apiBaseUrl: `http://${apiHost}:8443/api`,
};
