import { Injectable, signal } from '@angular/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  private readonly enabledKey = 'medisync_mobile_biometric_enabled';

  readonly available = signal(false);
  readonly unlocked = signal(false);
  readonly enabled = signal(this.readEnabled());

  async refreshAvailability(): Promise<boolean> {
    try {
      const result = await BiometricAuth.checkBiometry();
      const canUnlock = !!result.isAvailable || !!result.deviceIsSecure;
      this.available.set(canUnlock);
      return canUnlock;
    } catch {
      this.available.set(false);
      return false;
    }
  }

  isEnabled(): boolean {
    return this.enabled();
  }

  needsUnlock(hasSession: boolean): boolean {
    return hasSession && this.enabled() && !this.unlocked();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      const available = await this.refreshAvailability();
      if (!available) {
        throw new Error('Aucune biometrie ou code appareil exploitable n est disponible sur ce terminal.');
      }
    }

    localStorage.setItem(this.enabledKey, JSON.stringify(enabled));
    this.enabled.set(enabled);

    if (!enabled) {
      this.clearUnlock();
    }
  }

  markUnlocked(): void {
    this.unlocked.set(true);
  }

  clearUnlock(): void {
    this.unlocked.set(false);
  }

  async authenticateForUnlock(): Promise<void> {
    const available = await this.refreshAvailability();
    if (!available) {
      throw new Error('La biometrie n est pas disponible sur cet appareil.');
    }

    await BiometricAuth.authenticate({
      reason: 'Deverrouillez votre espace MediSync',
      cancelTitle: 'Annuler',
      allowDeviceCredential: true,
    });

    this.markUnlocked();
  }

  private readEnabled(): boolean {
    const raw = localStorage.getItem(this.enabledKey);
    return raw === 'true';
  }
}
