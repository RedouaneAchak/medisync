package com.medisync.controller;

import com.medisync.model.nosql.Consultation;
import com.medisync.service.ConsultationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Gestion des consultations médicales (MongoDB).
 * Routes : /api/consultations/**
 *
 * Accès :
 *  - Médecin : créer, modifier, ajouter des fichiers
 *  - Patient  : lire son historique (via PatientController /medical-history)
 *  - Admin    : accès complet
 */
@RestController
@RequestMapping("/api/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationService consultationService;

    // ── Création ──────────────────────────────────────────────────────────────

    /**
     * POST /api/consultations
     * Le médecin rédige le compte rendu après une consultation.
     * Crée un document MongoDB avec observation et prescriptions.
     *
     * Body JSON :
     * {
     *   "patientId": 1,
     *   "doctorId": 2,
     *   "observation": "Patient présente une hypertension légère.",
     *   "prescriptions": ["Amlodipine 5mg - 1x/jour", "Contrôle tensionnel à J+30"]
     * }
     */
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
     * Null-safe : seuls les champs fournis sont modifiés.
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

    // ── Ajout de fichier au dossier ───────────────────────────────────────────

    /**
     * POST /api/consultations/{id}/files
     * Ajoute un document médical (imagerie, résultat labo) à une consultation.
     *
     * Body JSON :
     * { "fileName": "radio_thorax.dcm", "fileType": "DICOM", "fileUrl": "/files/...", "uploadedAt": "..." }
     */
    @PostMapping("/{id}/files")
    public ResponseEntity<Consultation> addFile(
            @PathVariable String id,
            @RequestBody Map<String, Object> fileMetadata) {
        return ResponseEntity.ok(consultationService.addFile(id, fileMetadata));
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    /**
     * GET /api/consultations/{id}
     * Récupère une consultation par son ID MongoDB.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Consultation> getById(@PathVariable String id) {
        return ResponseEntity.ok(consultationService.getById(id));
    }

    /**
     * GET /api/consultations/patient/{patientId}
     * Historique complet des consultations d'un patient.
     * Utilisé par le médecin pendant la consultation pour voir les antécédents.
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Consultation>> getByPatient(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(consultationService.getByPatient(patientId));
    }

    /**
     * GET /api/consultations/doctor/{doctorId}
     * Toutes les consultations réalisées par un médecin.
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
