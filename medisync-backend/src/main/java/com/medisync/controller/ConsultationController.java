package com.medisync.controller;

import com.medisync.dto.MedicationSuggestionDto;
import com.medisync.model.nosql.Consultation;
import com.medisync.model.nosql.PrescriptionItem;
import com.medisync.service.ConsultationService;
import com.medisync.service.MedicationCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gestion des consultations médicales (MongoDB).
 * Routes : /api/consultations/**
 *
 * Accès :
 * - Médecin : créer, modifier, ajouter des fichiers
 * - Patient  : lire son historique (via PatientController /medical-history)
 * - Admin    : accès complet
 */
@RestController
@RequestMapping("/api/consultations") // <-- Note: Plural "consultations"
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationService consultationService;
    private final MedicationCatalogService medicationCatalogService;

    // ── Création ──────────────────────────────────────────────────────────────

    /**
     * POST /api/consultations
     * Le médecin rédige le compte rendu après une consultation.
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('DOCTOR','ADMIN','MANAGE_MEDICAL_RECORDS')")
    public ResponseEntity<Consultation> create(
            @RequestBody ConsultationRequest request) {
        return ResponseEntity.ok(
                consultationService.create(
                        request.getPatientId(),
                        request.getDoctorId(),
                        request.getTemplateName(),
                        request.getConsultationReason(),
                        request.getDiagnosis(),
                        request.getObservation(),
                        request.getFollowUpPlan(),
                        request.getVitals(),
                        request.getPrescriptions(),
                        request.getPrescriptionItems()
                )
        );
    }

    // ── Modification ──────────────────────────────────────────────────────────

    /**
     * PUT /api/consultations/{id}
     * Met à jour les notes ou prescriptions d'une consultation existante.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('DOCTOR','ADMIN','MANAGE_MEDICAL_RECORDS')")
    public ResponseEntity<Consultation> update(
            @PathVariable String id,
            @RequestBody ConsultationUpdateRequest request) {
        return ResponseEntity.ok(
                consultationService.update(
                        id,
                        request.getTemplateName(),
                        request.getConsultationReason(),
                        request.getDiagnosis(),
                        request.getObservation(),
                        request.getFollowUpPlan(),
                        request.getVitals(),
                        request.getPrescriptions(),
                        request.getPrescriptionItems()
                )
        );
    }

    @GetMapping("/medications/search")
    @PreAuthorize("hasAnyAuthority('DOCTOR','ADMIN','MANAGE_MEDICAL_RECORDS')")
    public ResponseEntity<List<MedicationSuggestionDto>> searchMedications(
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(medicationCatalogService.search(q));
    }

    // ── Ajout de fichier au dossier (UPLOAD PHYSIQUE) ─────────────────────────

    /**
     * POST /api/consultations/{id}/upload
     * Reçoit un fichier physique (PDF, Image, etc.) depuis Angular.
     */
@PostMapping(value = "/{id}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('DOCTOR','ADMIN','MANAGE_MEDICAL_RECORDS')")
    public ResponseEntity<Consultation> uploadFile(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("fileType") String fileType) {

        if (file.isEmpty()) {
            throw new RuntimeException("Le fichier sélectionné est vide.");
        }

        try {
            // 1. Create an "uploads" folder on your computer if it doesn't exist yet
            Path uploadDirectory = Paths.get("uploads");
            if (!Files.exists(uploadDirectory)) {
                Files.createDirectories(uploadDirectory);
            }

            // 2. Clean the file name and save the physical file to the folder
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = uploadDirectory.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // 3. Generate the metadata for MongoDB
            Map<String, Object> fileMetadata = new HashMap<>();
            fileMetadata.put("fileName", file.getOriginalFilename());
            fileMetadata.put("fileType", fileType);
            // This URL tells Angular exactly where to find the file later
            fileMetadata.put("fileUrl", "/uploads/" + fileName); 
            fileMetadata.put("uploadedAt", LocalDateTime.now().toString());
            fileMetadata.put("size", file.getSize());

            // 4. Save the metadata text to MongoDB
            return ResponseEntity.ok(consultationService.addFile(id, fileMetadata));

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la sauvegarde du fichier : " + e.getMessage());
        }
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    /**
     * GET /api/consultations/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('DOCTOR','ADMIN','MANAGE_MEDICAL_RECORDS')")
    public ResponseEntity<Consultation> getById(@PathVariable String id) {
        return ResponseEntity.ok(consultationService.getById(id));
    }

    /**
     * GET /api/consultations/patient/{patientId}
     */
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyAuthority('DOCTOR','ADMIN','MANAGE_MEDICAL_RECORDS')")
    public ResponseEntity<List<Consultation>> getByPatient(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(consultationService.getByPatient(patientId));
    }

    /**
     * GET /api/consultations/doctor/{doctorId}
     */
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyAuthority('DOCTOR','ADMIN','MANAGE_MEDICAL_RECORDS')")
    public ResponseEntity<List<Consultation>> getByDoctor(
            @PathVariable Long doctorId) {
        return ResponseEntity.ok(consultationService.getByDoctor(doctorId));
    }

    // ── DTOs internes ─────────────────────────────────────────────────────────

    @lombok.Data
    public static class ConsultationRequest {
        private Long patientId;
        private Long doctorId;
        private String templateName;
        private String consultationReason;
        private String diagnosis;
        private String observation;
        private String followUpPlan;
        private Map<String, String> vitals;
        private java.util.List<String> prescriptions;
        private java.util.List<PrescriptionItem> prescriptionItems;
    }

    @lombok.Data
    public static class ConsultationUpdateRequest {
        private String templateName;
        private String consultationReason;
        private String diagnosis;
        private String observation;
        private String followUpPlan;
        private Map<String, String> vitals;
        private java.util.List<String> prescriptions;
        private java.util.List<PrescriptionItem> prescriptionItems;
    }
}
