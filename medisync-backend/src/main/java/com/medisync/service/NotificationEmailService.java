package com.medisync.service;

import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Invoice;
import com.medisync.model.sql.Patient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
public class NotificationEmailService {

    private static final Logger log = LoggerFactory.getLogger(NotificationEmailService.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${medisync.notifications.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${medisync.notifications.email.from:no-reply@medisync.local}")
    private String fromAddress;

    public NotificationEmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public void sendAppointmentEvent(Appointment appointment, String type) {
        String email = extractPatientEmail(appointment != null ? appointment.getPatient() : null);
        if (email == null || appointment == null || appointment.getDateTime() == null) {
            return;
        }

        String subject = switch (type) {
            case "APPOINTMENT_CONFIRMED" -> "MediSync - rendez-vous confirmé";
            case "APPOINTMENT_CANCELLED" -> "MediSync - rendez-vous annulé";
            case "APPOINTMENT_UPDATED" -> "MediSync - rendez-vous modifié";
            default -> "MediSync - rendez-vous enregistré";
        };

        String patientName = patientDisplayName(appointment.getPatient());
        String doctorName = appointment.getDoctor() != null && appointment.getDoctor().getUser() != null
                ? "Dr. " + appointment.getDoctor().getUser().getFirstname() + " " + appointment.getDoctor().getUser().getLastname()
                : "votre médecin";
        String body = "Bonjour " + patientName + ",\n\n"
                + "Votre rendez-vous MediSync a bien été pris en compte.\n"
                + "Statut : " + normalizeLabel(type) + "\n"
                + "Médecin : " + doctorName + "\n"
                + "Date : " + appointment.getDateTime().format(DATE_TIME_FORMATTER) + "\n"
                + "Durée : " + (appointment.getDurationMinutes() != null ? appointment.getDurationMinutes() : 30) + " minutes\n"
                + "Motif : " + defaultText(appointment.getAppointmentType(), "Consultation") + "\n\n"
                + "Merci de votre confiance.\n"
                + "Equipe MediSync";

        send(email, subject, body);
    }

    public void sendAppointmentReminder(Appointment appointment, String type) {
        String email = extractPatientEmail(appointment != null ? appointment.getPatient() : null);
        if (email == null || appointment == null || appointment.getDateTime() == null) {
            return;
        }

        String reminderLabel = "1H_REMINDER".equalsIgnoreCase(type) ? "dans 1 heure" : "dans 24 heures";
        String body = "Bonjour " + patientDisplayName(appointment.getPatient()) + ",\n\n"
                + "Rappel automatique MediSync : votre rendez-vous est prévu " + reminderLabel + ".\n"
                + "Date : " + appointment.getDateTime().format(DATE_TIME_FORMATTER) + "\n"
                + "Motif : " + defaultText(appointment.getAppointmentType(), "Consultation") + "\n\n"
                + "A très bientôt,\n"
                + "Equipe MediSync";

        send(email, "MediSync - rappel de rendez-vous", body);
    }

    public void sendInvoice(Invoice invoice) {
        if (invoice == null || invoice.getAppointment() == null) {
            return;
        }

        String email = extractPatientEmail(invoice.getAppointment().getPatient());
        if (email == null) {
            return;
        }

        String patientName = patientDisplayName(invoice.getAppointment().getPatient());
        String body = "Bonjour " + patientName + ",\n\n"
                + "Votre facture MediSync est disponible.\n"
                + "Référence : FAC-" + invoice.getId() + "\n"
                + "Montant : " + invoice.getTotalAmount() + " MAD\n"
                + "Mode de paiement : " + defaultText(invoice.getPaymentMethod(), "Non renseigné") + "\n"
                + "Statut : " + (Boolean.TRUE.equals(invoice.getIsPaid()) ? "Payée" : "En attente") + "\n\n"
                + "Vous pouvez la consulter depuis votre espace patient.\n"
                + "Equipe MediSync";

        send(email, "MediSync - facture FAC-" + invoice.getId(), body);
    }

    private void send(String to, String subject, String body) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (!emailEnabled || mailSender == null) {
            log.info("Email skipped for {} with subject '{}': SMTP disabled or not configured.", to, subject);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setFrom(fromAddress);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception exception) {
            log.warn("Email delivery failed for {} with subject '{}': {}", to, subject, exception.getMessage());
        }
    }

    private String extractPatientEmail(Patient patient) {
        if (patient == null || patient.getUser() == null || patient.getUser().getEmail() == null || patient.getUser().getEmail().isBlank()) {
            return null;
        }
        return patient.getUser().getEmail().trim();
    }

    private String patientDisplayName(Patient patient) {
        if (patient == null) {
            return "patient";
        }
        String firstname = defaultText(patient.getFirstName(), patient.getUser() != null ? patient.getUser().getFirstname() : "Patient");
        String lastname = defaultText(patient.getLastName(), patient.getUser() != null ? patient.getUser().getLastname() : "");
        return (firstname + " " + lastname).trim();
    }

    private String normalizeLabel(String type) {
        return switch (type) {
            case "APPOINTMENT_CONFIRMED" -> "Confirmé";
            case "APPOINTMENT_CANCELLED" -> "Annulé";
            case "APPOINTMENT_UPDATED" -> "Modifié";
            default -> "Enregistré";
        };
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
