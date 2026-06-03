package com.medisync.service;

import com.medisync.model.nosql.AuditLog;
import com.medisync.model.nosql.Consultation;
import com.medisync.model.sql.Appointment;
import com.medisync.repository.nosql.AuditLogRepository;
import com.medisync.repository.nosql.ConsultationRepository;
import com.medisync.repository.sql.AppointmentRepository;
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
    private final AppointmentRepository appointmentRepository;
    private final InvoiceService invoiceService;

    // ── Création d'une consultation ───────────────────────────────────────────

    public Consultation create(Long patientId, Long doctorId,
                               String observation, List<String> prescriptions) {
        return create(patientId, doctorId, null, observation, prescriptions);
    }

    public Consultation create(Long patientId, Long doctorId, Long appointmentId,
                               String observation, List<String> prescriptions) {
        Appointment appointment = null;
        if (appointmentId != null) {
            appointment = appointmentRepository.findById(appointmentId)
                    .orElseThrow(() -> new RuntimeException("Rendez-vous introuvable : " + appointmentId));
            if (!appointment.getPatient().getId().equals(patientId) || !appointment.getDoctor().getId().equals(doctorId)) {
                throw new RuntimeException("Le rendez-vous choisi ne correspond pas au patient et au medecin.");
            }
        }

        Consultation c = new Consultation();
        c.setPatientId(patientId);
        c.setDoctorId(doctorId);
        c.setAppointmentId(appointmentId);
        c.setObservation(observation);
        c.setPrescriptions(prescriptions != null ? prescriptions : new ArrayList<>());
        c.setFiles(new ArrayList<>());
        
        // --- THE FIX: Stamp the exact creation time! ---
        c.setCreatedAt(LocalDateTime.now());

        Consultation saved = consultationRepository.save(c);
        if (appointment != null && appointment.getInvoice() == null) {
            Double amount = appointment.getDoctor().getStandardConsultationRate();
            invoiceService.generate(appointmentId, amount != null && amount > 0 ? amount : 300.0, "A_DEFINIR");
        }
        logAudit(doctorId, "CREATE_CONSULTATION", "Patient#" + patientId);
        return saved;
    }

    // ── Mise à jour (ajout d'observations / prescriptions) ────────────────────

    public Consultation update(String consultationId, String observation,
                               List<String> prescriptions) {
        Consultation c = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable : " + consultationId));

        if (observation != null)    c.setObservation(observation);
        if (prescriptions != null)  c.setPrescriptions(prescriptions);

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

    public List<Consultation> getAll() {
        return consultationRepository.findAll();
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
}
