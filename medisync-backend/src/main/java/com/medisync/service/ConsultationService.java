package com.medisync.service;

import com.medisync.model.nosql.AuditLog;
import com.medisync.model.nosql.Consultation;
import com.medisync.model.nosql.PrescriptionItem;
import com.medisync.repository.nosql.AuditLogRepository;
import com.medisync.repository.nosql.ConsultationRepository;
import com.medisync.repository.sql.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    // ── Création d'une consultation ───────────────────────────────────────────

    public Consultation create(Long patientId, Long doctorId,
                               String templateName,
                               String consultationReason,
                               String diagnosis,
                               String observation,
                               String followUpPlan,
                               Map<String, String> vitals,
                               List<String> prescriptions,
                               List<PrescriptionItem> prescriptionItems) {
        Consultation c = new Consultation();
        c.setPatientId(patientId);
        c.setDoctorId(doctorId);
        c.setTemplateName(templateName);
        c.setConsultationReason(consultationReason);
        c.setDiagnosis(diagnosis);
        c.setObservation(observation);
        c.setFollowUpPlan(followUpPlan);
        c.setVitals(vitals);
        c.setPrescriptionItems(normalizePrescriptionItems(prescriptionItems));
        c.setPrescriptions(buildPrescriptionLines(prescriptions, c.getPrescriptionItems()));
        c.setFiles(new ArrayList<>());
        
        // --- THE FIX: Stamp the exact creation time! ---
        c.setCreatedAt(LocalDateTime.now());

        Consultation saved = consultationRepository.save(c);
        logAudit(doctorId, "CREATE_CONSULTATION", "Patient#" + patientId);
        return saved;
    }

    // ── Mise à jour (ajout d'observations / prescriptions) ────────────────────

    public Consultation update(String consultationId,
                               String templateName,
                               String consultationReason,
                               String diagnosis,
                               String observation,
                               String followUpPlan,
                               Map<String, String> vitals,
                               List<String> prescriptions,
                               List<PrescriptionItem> prescriptionItems) {
        Consultation c = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable : " + consultationId));

        if (templateName != null) c.setTemplateName(templateName);
        if (consultationReason != null) c.setConsultationReason(consultationReason);
        if (diagnosis != null) c.setDiagnosis(diagnosis);
        if (observation != null) c.setObservation(observation);
        if (followUpPlan != null) c.setFollowUpPlan(followUpPlan);
        if (vitals != null) c.setVitals(vitals);
        if (prescriptionItems != null) c.setPrescriptionItems(normalizePrescriptionItems(prescriptionItems));
        if (prescriptions != null || prescriptionItems != null) {
            c.setPrescriptions(buildPrescriptionLines(prescriptions, c.getPrescriptionItems()));
        }

        return consultationRepository.save(c);
    }

    // ── Ajout d'un document au dossier ────────────────────────────────────────

    public Consultation addFile(String consultationId, Map<String, Object> fileMetadata) {
        Consultation c = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable : " + consultationId));

        if (c.getFiles() == null) c.setFiles(new ArrayList<>());
        c.getFiles().add(fileMetadata);
        return consultationRepository.save(c);
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    public Consultation getById(String id) {
        return consultationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable : " + id));
    }

    public List<Consultation> getByPatient(Long patientId) {
        return consultationRepository.findByPatientId(patientId);
    }

    public List<Consultation> getByDoctor(Long doctorId) {
        // Note: For production, it is highly recommended to create a custom 
        // findByDoctorId(Long doctorId) method in your ConsultationRepository 
        // instead of using findAll() which pulls the entire database into memory.
        return consultationRepository.findAll().stream().filter(c -> doctorId.equals(c.getDoctorId())).toList();
    }

    // ── Audit ─────────────────────────────────────────────────────────────────

    private void logAudit(Long userId, String action, String target) {
        AuditLog log = new AuditLog();
        log.setUserId(userId);
        log.setAction(action);
        log.setTargetEntity(target);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    private List<PrescriptionItem> normalizePrescriptionItems(List<PrescriptionItem> items) {
        if (items == null) {
            return new ArrayList<>();
        }
        return items.stream()
                .filter(item -> item != null && item.getMedicationName() != null && !item.getMedicationName().isBlank())
                .map(item -> {
                    PrescriptionItem normalized = new PrescriptionItem();
                    normalized.setMedicationName(item.getMedicationName().trim());
                    normalized.setDosage(item.getDosage());
                    normalized.setFrequency(item.getFrequency());
                    normalized.setDurationDays(item.getDurationDays());
                    normalized.setInstructions(item.getInstructions());
                    return normalized;
                })
                .toList();
    }

    private List<String> buildPrescriptionLines(List<String> prescriptions, List<PrescriptionItem> items) {
        if (items != null && !items.isEmpty()) {
            return items.stream()
                    .map(item -> item.getMedicationName()
                            + (item.getDosage() == null || item.getDosage().isBlank() ? "" : " - " + item.getDosage())
                            + (item.getFrequency() == null || item.getFrequency().isBlank() ? "" : " - " + item.getFrequency()))
                    .toList();
        }
        return prescriptions != null ? prescriptions : new ArrayList<>();
    }
}
