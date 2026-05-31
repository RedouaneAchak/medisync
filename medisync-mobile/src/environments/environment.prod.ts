import { Capacitor } from '@capacitor/core';

const apiHost = Capacitor.getPlatform() === 'android' ? '10.0.2.2' : 'localhost';

export const environment = {
  production: true,
  apiBaseUrl: `http://${apiHost}:8443/api`,
};
