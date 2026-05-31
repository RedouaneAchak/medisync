import { Injectable } from '@angular/core';

import { getRuntimeConfig } from '../core/runtime-config';
import { GoogleButtonOptions, GoogleCredentialResponse, GoogleIdConfiguration } from '../core/google-identity.types';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly runtimeConfig = getRuntimeConfig();
  private initialized = false;

  get isConfigured(): boolean {
    return this.runtimeConfig.googleClientId.trim() !== '' && this.runtimeConfig.googleClientId !== 'disabled';
  }

  async renderButton(
    host: HTMLElement,
    callback: (response: GoogleCredentialResponse) => void,
    options: GoogleButtonOptions = {},
  ): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Google Sign-In n’est pas configuré pour cette application.');
    }

    const google = await this.waitForGoogle();
    if (!this.initialized) {
      const config: GoogleIdConfiguration = {
        client_id: this.runtimeConfig.googleClientId,
        callback,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      };
      google.accounts.id.initialize(config);
      this.initialized = true;
    }

    host.innerHTML = '';
    google.accounts.id.renderButton(host, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 320,
      locale: 'fr',
      ...options,
    });
  }

  async prompt(): Promise<void> {
    if (!this.isConfigured) {
      return;
    }

    const google = await this.waitForGoogle();
    google.accounts.id.prompt();
  }

  private waitForGoogle(): Promise<NonNullable<Window['google']>> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + 8000;

      const tick = () => {
        if (window.google?.accounts?.id) {
          resolve(window.google);
          return;
        }

        if (Date.now() > deadline) {
          reject(new Error('La librairie Google Identity Services n’a pas chargé.'));
          return;
        }

        window.setTimeout(tick, 150);
      };

      tick();
    });
  }
}
