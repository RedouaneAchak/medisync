package com.medisync.service;

import com.medisync.model.nosql.AuditLog;
import com.medisync.model.nosql.Consultation;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.User;
import com.medisync.repository.nosql.AuditLogRepository;
import com.medisync.repository.nosql.ConsultationRepository;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final AuditLogRepository auditLogRepository;

    // ── Profil ────────────────────────────────────────────────────────────────

    public Patient getProfile(Long patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient introuvable : " + patientId));
    }

    @Transactional
    // Inside PatientService.java
    public Patient updateProfile(Long id, Patient updatedPatient) {
        // Just save the complete object exactly as Angular sent it
        return patientRepository.save(updatedPatient);
    }

    // ── Rendez-vous ───────────────────────────────────────────────────────────

    public List<Appointment> getAppointmentHistory(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    // ── Dossier médical (MongoDB) ─────────────────────────────────────────────

    public List<Consultation> getMedicalHistory(Long patientId, String requestingUserEmail) {
        logAudit(requestingUserEmail, "READ_MEDICAL_HISTORY", "Patient#" + patientId);
        return consultationRepository.findByPatientId(patientId);
    }

    /**
     * Ajoute un document externe au dossier (résultat labo, radio…).
     * fileMetadata doit contenir : fileName, fileType, fileUrl, uploadedAt
     */
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
                    return c;
                });

        if (consultation.getFiles() == null) {
            consultation.setFiles(new java.util.ArrayList<>());
        }
        consultation.getFiles().add(fileMetadata);
        return consultationRepository.save(consultation);
    }

    // ── Tiers (enfant/personne dépendante) ────────────────────────────────────

    /**
     * Renvoie les patients rattachés à ce tuteur (mineurs, personnes dépendantes).
     */
    public List<Patient> getDependents(Long guardianId) {
        return patientRepository.findAll()
                .stream()
                .filter(p -> p.getGuardian() != null && p.getGuardian().getId().equals(guardianId))
                .toList();
    }

    // ── Audit ─────────────────────────────────────────────────────────────────

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
}
