import type { MediSyncRuntimeConfig } from './runtime-config';

export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: 'popup' | 'redirect';
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string | number;
  locale?: string;
}

interface GoogleAccountsIdApi {
  initialize(config: GoogleIdConfiguration): void;
  renderButton(element: HTMLElement, options: GoogleButtonOptions): void;
  prompt(momentListener?: (notification: unknown) => void): void;
}

interface GoogleAccountsApi {
  id: GoogleAccountsIdApi;
}

interface GoogleNamespace {
  accounts: GoogleAccountsApi;
}

declare global {
  interface Window {
    google?: GoogleNamespace;
    __MEDISYNC_CONFIG__?: Partial<MediSyncRuntimeConfig>;
  }
}

export {};
