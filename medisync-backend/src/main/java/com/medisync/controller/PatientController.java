package com.medisync.controller;

import com.medisync.model.nosql.Consultation;
import com.medisync.service.ConsultationService;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Patient;
import com.medisync.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize; // <-- IMPORT ADDED POUR LA SÉCURITÉ
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.time.format.DateTimeFormatter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Espace patient — accessible uniquement aux rôles PATIENT et ADMIN.
 * Routes protégées par SecurityConfig : /api/patient/**
 */
@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;
    private final ConsultationService consultationService;

    // ── Recherche de patients (Ajout pour les Médecins/Secrétaires) ───────────

    @PreAuthorize("hasAnyAuthority('DOCTOR', 'SECRETARY', 'ADMIN')")
    @GetMapping("/search")
    public ResponseEntity<List<Patient>> searchPatients(@RequestParam("q") String query) {
        // Appelle la méthode du service que vous avez créée pour interroger la base de données
        return ResponseEntity.ok(patientService.searchPatientsByName(query));
    }

    // ── Profil ────────────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<Patient> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getProfile(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patient> updateProfile(
            @PathVariable Long id,
            @RequestBody Patient updated) {
        return ResponseEntity.ok(patientService.updateProfile(id, updated));
    }

    // ── Historique des rendez-vous ────────────────────────────────────────────

    @GetMapping("/{id}/appointments")
    public ResponseEntity<List<Appointment>> getAppointments(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getAppointmentHistory(id));
    }

    // ── Dossier médical (MongoDB) ─────────────────────────────────────────────

    @GetMapping("/{id}/medical-history")
    public ResponseEntity<List<Consultation>> getMedicalHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails currentUser) {
        return ResponseEntity.ok(
                patientService.getMedicalHistory(id, currentUser.getUsername()));
    }

    // ── Ajout de document par le patient (UPLOAD PHYSIQUE) ────────────────────

    /**
     * POST /api/patient/{id}/upload
     * Reçoit un document physique depuis l'interface Angular du Patient.
     */
    @PostMapping(value = "/{id}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Consultation> uploadFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("fileType") String fileType,
            @RequestParam(value = "doctorId", defaultValue = "0") Long doctorId) {

        if (file.isEmpty()) {
            throw new RuntimeException("Le fichier sélectionné est vide.");
        }

        try {
            // 1. Fetch the patient to get their real name
            Patient patient = patientService.getProfile(id);

            // NOTE: If your name fields are inside a User object, change this to:
            // String rawName = patient.getUser().getFirstname() + "_" +
            // patient.getUser().getLastname();
            String rawName = patient.getFirstName() + "_" + patient.getLastName();

            // Remove spaces and weird characters so the computer OS doesn't crash
            String safePatientName = rawName.replaceAll("[^a-zA-Z0-9]", "_");

            // 2. Format the time to be human-readable (e.g., 2026-05-30_14-30-00)
            DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
            String formattedDate = LocalDateTime.now().format(formatter);

            // 3. Create uploads folder
            Path uploadDirectory = Paths.get("uploads");
            if (!Files.exists(uploadDirectory)) {
                Files.createDirectories(uploadDirectory);
            }

            // 4. Construct the beautiful new file name!
            String originalName = file.getOriginalFilename();
            // Result: "2026-05-30_14-30-00_Hamza_Benkirane_radio.pdf"
            String fileName = formattedDate + "_" + safePatientName + "_" + originalName;

            Path filePath = uploadDirectory.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // 5. Generate MongoDB metadata using the new name
            Map<String, Object> fileMetadata = new HashMap<>();
            fileMetadata.put("fileName", originalName); // Keep the clean original name for the UI
            fileMetadata.put("fileType", fileType);
            fileMetadata.put("fileUrl", "/uploads/" + fileName); // Point to the complex physical name
            fileMetadata.put("uploadedAt", LocalDateTime.now().toString());
            fileMetadata.put("size", file.getSize());

            // 6. Create a generic dossier entry and attach the file
            Consultation genericEntry = consultationService.create(
                    id,
                    doctorId == 0 ? null : doctorId,
                    "Document ajouté par le patient",
                    null);

            Consultation saved = consultationService.addFile(genericEntry.getId(), fileMetadata);

            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la sauvegarde du fichier : " + e.getMessage());
        }
    }

    // ── Tiers (enfant / personne dépendante) ──────────────────────────────────

    @GetMapping("/{id}/dependents")
    public ResponseEntity<List<Patient>> getDependents(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getDependents(id));
    }
}