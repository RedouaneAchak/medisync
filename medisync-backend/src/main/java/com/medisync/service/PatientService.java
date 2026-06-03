package com.medisync.service;
import org.springframework.stereotype.Service;
import com.medisync.model.nosql.AuditLog;
import com.medisync.model.nosql.Consultation;
import com.medisync.model.enums.PatientCategory;
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
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;    
import java.util.Collections;

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

    public Patient getProfileForUser(String email) {
        return patientRepository.findByUserEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profil patient introuvable."));
    }

    @Transactional
    public Patient updateProfileForUser(String email, Patient updatedData) {
        Patient existing = getProfileForUser(email);
        return applyProfileUpdate(existing, updatedData);
    }

    @Transactional
    public Patient updateProfile(Long id, Patient updatedData) {
        // 1. Fetch the existing patient (this pulls the secure password into memory)
        Patient existing = patientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        return applyProfileUpdate(existing, updatedData);
    }

    private Patient applyProfileUpdate(Patient existing, Patient updatedData) {
        String newSsn = updatedData.getSocialSecurityNumber();
        if (newSsn != null && !newSsn.isBlank()) {
            Optional<Patient> duplicateCheck = patientRepository.findBySocialSecurityNumber(newSsn);

            // If the SSN exists AND it belongs to a different user, throw a clean error!
            if (duplicateCheck.isPresent() && !duplicateCheck.get().getId().equals(existing.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This social number already exists");
            }
        }
        // 2. Update ONLY the fields Angular actually sends
        existing.setPhoneNumber(updatedData.getPhoneNumber());
        existing.setSocialSecurityNumber(updatedData.getSocialSecurityNumber());
        existing.setCategory(updatedData.getCategory());
        existing.setCompanyName(updatedData.getCompanyName());

        // 3. Update the User names, but leave the password alone!
        if (updatedData.getUser() != null) {
            existing.getUser().setFirstname(updatedData.getUser().getFirstname());
            existing.getUser().setLastname(updatedData.getUser().getLastname());
        }

        // 4. Save safely without crashing
        return patientRepository.save(existing);
    }
    public List<Patient> searchPatientsByName(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return patientRepository.searchByName(query.trim());
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
