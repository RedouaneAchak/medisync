export interface MediSyncRuntimeConfig {
  apiBaseUrl: string;
  googleClientId: string;
}

const defaultConfig: MediSyncRuntimeConfig = {
  apiBaseUrl: '',
  googleClientId: 'disabled',
};

export function getRuntimeConfig(): MediSyncRuntimeConfig {
  const config = window.__MEDISYNC_CONFIG__;
  return {
    apiBaseUrl: config?.apiBaseUrl ?? defaultConfig.apiBaseUrl,
    googleClientId: config?.googleClientId ?? defaultConfig.googleClientId,
  };
}
