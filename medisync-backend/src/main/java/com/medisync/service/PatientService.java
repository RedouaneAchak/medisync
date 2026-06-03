package com.medisync.service;

import com.medisync.dto.PatientNotificationDto;
import com.medisync.model.nosql.AuditLog;
import com.medisync.model.nosql.Consultation;
import com.medisync.model.nosql.NotificationLog;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Patient;
import com.medisync.repository.nosql.AuditLogRepository;
import com.medisync.repository.nosql.ConsultationRepository;
import com.medisync.repository.nosql.NotificationLogRepository;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.InvoiceRepository;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final AuditLogRepository auditLogRepository;
    private final InvoiceRepository invoiceRepository;
    private final NotificationLogRepository notificationLogRepository;

    public Patient getProfile(Long patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient introuvable : " + patientId));
    }

    @Transactional
    public Patient updateProfile(Long id, Patient updatedData) {
        Patient existing = patientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        String newSsn = normalizeSsn(updatedData.getSocialSecurityNumber());
        if (newSsn != null) {
            Optional<Patient> duplicateCheck = patientRepository.findBySocialSecurityNumber(newSsn);
            if (duplicateCheck.isPresent() && !duplicateCheck.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This social number already exists");
            }
        }

        existing.setPhoneNumber(updatedData.getPhoneNumber());
        existing.setSocialSecurityNumber(newSsn);
        existing.setCategory(updatedData.getCategory());
        existing.setCompanyName(updatedData.getCompanyName());
        existing.setAllergies(updatedData.getAllergies());
        existing.setMedicalAntecedents(updatedData.getMedicalAntecedents());
        existing.setCurrentTreatments(updatedData.getCurrentTreatments());

        if (updatedData.getUser() != null) {
            existing.getUser().setFirstname(updatedData.getUser().getFirstname());
            existing.getUser().setLastname(updatedData.getUser().getLastname());
        }

        return patientRepository.save(existing);
    }

    public List<Appointment> getAppointmentHistory(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    public List<Consultation> getMedicalHistory(Long patientId, String requestingUserEmail) {
        logAudit(requestingUserEmail, "READ_MEDICAL_HISTORY", "Patient#" + patientId);
        return consultationRepository.findByPatientId(patientId);
    }

    public List<PatientNotificationDto> getNotifications(Long patientId) {
        LocalDateTime now = LocalDateTime.now();
        List<PatientNotificationDto> items = new ArrayList<>();

        appointmentRepository.findByPatientId(patientId).stream()
                .filter(appointment -> appointment.getDateTime() != null)
                .filter(appointment -> !"CANCELLED".equalsIgnoreCase(appointment.getStatus()))
                .filter(appointment -> !appointment.getDateTime().isBefore(now))
                .filter(appointment -> !appointment.getDateTime().isAfter(now.plusHours(24)))
                .forEach(appointment -> {
                    long minutesBefore = ChronoUnit.MINUTES.between(now, appointment.getDateTime());
                    String expectedType = minutesBefore <= 60 ? "1H_REMINDER" : "24H_REMINDER";
                    if (notificationLogRepository.existsByAppointmentIdAndType(appointment.getId(), expectedType)) {
                        return;
                    }
                    items.add(PatientNotificationDto.builder()
                            .title(minutesBefore <= 60 ? "Rappel de rendez-vous imminent" : "Rappel de rendez-vous")
                            .detail("Votre "
                                    + (appointment.getAppointmentType() != null ? appointment.getAppointmentType() : "consultation")
                                    + " est prévue le "
                                    + appointment.getDateTime().toLocalDate()
                                    + " à "
                                    + appointment.getDateTime().toLocalTime().truncatedTo(ChronoUnit.MINUTES)
                                    + ".")
                            .tone(minutesBefore <= 60 ? "blue" : "green")
                            .category("appointment")
                            .createdAt(appointment.getDateTime())
                            .build());
                });

        invoiceRepository.findByAppointmentPatientId(patientId).stream()
                .filter(invoice -> !Boolean.TRUE.equals(invoice.getIsPaid()))
                .forEach(invoice -> items.add(PatientNotificationDto.builder()
                        .title("Facture en attente")
                        .detail("La facture FAC-" + invoice.getId() + " de " + invoice.getTotalAmount() + " MAD est encore à régler.")
                        .tone("yellow")
                        .category("invoice")
                        .createdAt(invoice.getIssueDate() != null ? invoice.getIssueDate() : now)
                        .build()));

        notificationLogRepository.findByPatientIdOrderBySentAtDesc(patientId).stream()
                .limit(10)
                .forEach(log -> items.add(toNotificationDto(log)));

        return items.stream()
                .sorted(Comparator.comparing(PatientNotificationDto::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(20)
                .toList();
    }

    @Transactional
    public Consultation uploadDocument(Long patientId, Long doctorId, Map<String, Object> fileMetadata) {
        Consultation consultation = consultationRepository
                .findByPatientId(patientId)
                .stream().findFirst()
                .orElseGet(() -> {
                    Consultation c = new Consultation();
                    c.setPatientId(patientId);
                    c.setDoctorId(doctorId);
                    c.setFiles(new java.util.ArrayList<>());
                    c.setPrescriptions(new java.util.ArrayList<>());
                    c.setCreatedAt(LocalDateTime.now());
                    return c;
                });

        if (consultation.getFiles() == null) {
            consultation.setFiles(new java.util.ArrayList<>());
        }
        consultation.getFiles().add(fileMetadata);
        return consultationRepository.save(consultation);
    }

    public List<Patient> getDependents(Long guardianId) {
        return patientRepository.findAll()
                .stream()
                .filter(p -> p.getGuardian() != null && p.getGuardian().getId().equals(guardianId))
                .toList();
    }

    private void logAudit(String userEmail, String action, String target) {
        userRepository.findByEmail(userEmail).ifPresent(user -> {
            AuditLog log = new AuditLog();
            log.setUserId(user.getId());
            log.setAction(action);
            log.setTargetEntity(target);
            log.setTimestamp(LocalDateTime.now());
            auditLogRepository.save(log);
        });
    }

    private PatientNotificationDto toNotificationDto(NotificationLog log) {
        String title;
        String detail;
        String tone;

        switch (String.valueOf(log.getType())) {
            case "24H_REMINDER" -> {
                title = "Rappel automatique 24h";
                detail = "Votre rendez-vous est prévu dans moins de 24 heures. Pensez à vérifier l heure et les documents à apporter.";
                tone = "green";
            }
            case "1H_REMINDER" -> {
                title = "Rappel automatique 1h";
                detail = "Votre rendez-vous approche dans moins d une heure. Préparez-vous à vous rendre à la clinique.";
                tone = "blue";
            }
            case "APPOINTMENT_CANCELLED" -> {
                title = "Rendez-vous annulé";
                detail = "Un rendez-vous a été annulé. Vérifiez votre planning pour choisir un nouveau créneau.";
                tone = "red";
            }
            case "APPOINTMENT_UPDATED" -> {
                title = "Rendez-vous modifié";
                detail = "Les détails d'un rendez-vous ont été modifiés.";
                tone = "yellow";
            }
            case "APPOINTMENT_CONFIRMED" -> {
                title = "Rendez-vous confirmé";
                detail = "Votre rendez-vous a bien été confirmé par la clinique.";
                tone = "green";
            }
            default -> {
                title = "Rendez-vous créé";
                detail = "Votre demande de rendez-vous a été enregistrée.";
                tone = "blue";
            }
        }

        return PatientNotificationDto.builder()
                .title(title)
                .detail(detail)
                .tone(tone)
                .category("system")
                .createdAt(log.getSentAt())
                .build();
    }

    private String normalizeSsn(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.replaceAll("\\s+", "").trim();
    }
}
