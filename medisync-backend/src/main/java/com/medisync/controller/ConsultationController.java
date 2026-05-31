package com.medisync.controller;

import com.medisync.model.nosql.Consultation;
import com.medisync.repository.nosql.ConsultationRepository;
import com.medisync.service.ConsultationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
    private final ConsultationRepository repository;
    private final ConsultationService consultationService;
    
    // ── Création ──────────────────────────────────────────────────────────────

    /**
     * POST /api/consultations
     * Le médecin rédige le compte rendu après une consultation.
     */
    @GetMapping
    public List<Consultation> getAllConsultations() {
        return repository.findAll();
    }
    @PostMapping
    public ResponseEntity<Consultation> create(
            @RequestBody ConsultationRequest request) {
        return ResponseEntity.ok(
                consultationService.create(
                        request.getPatientId(),
                        request.getDoctorId(),
                        request.getObservation(),
                        request.getPrescriptions()
                )
        );
    }

    // ── Modification ──────────────────────────────────────────────────────────

    /**
     * PUT /api/consultations/{id}
     * Met à jour les notes ou prescriptions d'une consultation existante.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Consultation> update(
            @PathVariable String id,
            @RequestBody ConsultationUpdateRequest request) {
        return ResponseEntity.ok(
                consultationService.update(
                        id,
                        request.getObservation(),
                        request.getPrescriptions()
                )
        );
    }

    // ── Ajout de fichier au dossier (UPLOAD PHYSIQUE) ─────────────────────────

    /**
     * POST /api/consultations/{id}/upload
     * Reçoit un fichier physique (PDF, Image, etc.) depuis Angular.
     */
@PostMapping(value = "/{id}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
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
    public ResponseEntity<Consultation> getById(@PathVariable String id) {
        return ResponseEntity.ok(consultationService.getById(id));
    }

    /**
     * GET /api/consultations/patient/{patientId}
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Consultation>> getByPatient(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(consultationService.getByPatient(patientId));
    }

    /**
     * GET /api/consultations/doctor/{doctorId}
     */
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Consultation>> getByDoctor(
            @PathVariable Long doctorId) {
        return ResponseEntity.ok(consultationService.getByDoctor(doctorId));
    }

    // ── DTOs internes ─────────────────────────────────────────────────────────

    @lombok.Data
    public static class ConsultationRequest {
        private Long patientId;
        private Long doctorId;
        private String observation;
        private java.util.List<String> prescriptions;
    }

    @lombok.Data
    public static class ConsultationUpdateRequest {
        private String observation;
        private java.util.List<String> prescriptions;
    }
}