import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { BackendAppointment, BackendConsultation } from './medisync.models';

@Injectable({ providedIn: 'root' })
export class LocalReminderService {
  async syncAppointmentReminders(appointments: BackendAppointment[]): Promise<void> {
    if (!(await this.ensurePermission())) {
      return;
    }

    const now = Date.now();
    const notifications = appointments
      .filter((appointment) => appointment.status !== 'CANCELLED')
      .flatMap((appointment) => {
        const when = new Date(appointment.dateTime).getTime();
        const reminders = [
          { offsetMs: 24 * 60 * 60 * 1000, suffix: 1, title: 'Rappel rendez-vous 24h' },
          { offsetMs: 60 * 60 * 1000, suffix: 2, title: 'Rappel rendez-vous 1h' },
        ];

        return reminders
          .map((reminder) => {
            const scheduledAt = new Date(when - reminder.offsetMs);
            if (scheduledAt.getTime() <= now + 60_000) {
              return null;
            }
            return {
              id: 100000 + appointment.id * 10 + reminder.suffix,
              title: reminder.title,
              body: `${appointment.appointmentType ?? 'Consultation'} à ${scheduledAt.toLocaleDateString('fr-MA')} pour le rendez-vous du ${new Date(appointment.dateTime).toLocaleString('fr-MA')}.`,
              schedule: { at: scheduledAt },
            };
          })
          .filter((item): item is { id: number; title: string; body: string; schedule: { at: Date } } => item !== null);
      });

    if (!notifications.length) {
      return;
    }

    await LocalNotifications.schedule({ notifications });
  }

  async syncMedicationReminders(history: BackendConsultation[]): Promise<void> {
    if (!(await this.ensurePermission())) {
      return;
    }

    const medicationNames = Array.from(
      new Set(
        history.flatMap((consultation) =>
          (consultation.prescriptionItems?.length
            ? consultation.prescriptionItems.map((item) => item.medicationName)
            : consultation.prescriptions ?? []),
        ),
      ),
    ).filter(Boolean);

    const now = new Date();
    const nextMorning = new Date(now);
    nextMorning.setHours(8, 0, 0, 0);
    if (nextMorning.getTime() <= now.getTime()) {
      nextMorning.setDate(nextMorning.getDate() + 1);
    }

    const notifications = medicationNames.slice(0, 8).map((name, index) => ({
      id: 200000 + index,
      title: 'Rappel traitement MediSync',
      body: `Pensez à vérifier votre ordonnance et la prise du traitement : ${name}.`,
      schedule: { at: new Date(nextMorning.getTime() + index * 60_000) },
    }));

    if (!notifications.length) {
      return;
    }

    await LocalNotifications.schedule({ notifications });
  }

  private async ensurePermission(): Promise<boolean> {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') {
      return true;
    }
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  }
}
