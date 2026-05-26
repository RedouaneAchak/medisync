package com.medisync.controller;

import com.medisync.model.nosql.Consultation;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Patient;
import com.medisync.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

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

    // ── Profil ────────────────────────────────────────────────────────────────

    /**
     * GET /api/patient/{id}
     * Récupère le profil complet d'un patient.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Patient> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getProfile(id));
    }

    /**
     * PUT /api/patient/{id}
     * Met à jour les informations personnelles du patient (nom, téléphone…).
     */
    @PutMapping("/{id}")
    public ResponseEntity<Patient> updateProfile(
            @PathVariable Long id,
            @RequestBody Patient updated) {
        return ResponseEntity.ok(patientService.updateProfile(id, updated));
    }

    // ── Historique des rendez-vous ────────────────────────────────────────────

    /**
     * GET /api/patient/{id}/appointments
     * Retourne tous les rendez-vous passés et à venir du patient.
     */
    @GetMapping("/{id}/appointments")
    public ResponseEntity<List<Appointment>> getAppointments(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getAppointmentHistory(id));
    }

    // ── Dossier médical (MongoDB) ─────────────────────────────────────────────

    /**
     * GET /api/patient/{id}/medical-history
     * Retourne l'historique des consultations depuis MongoDB.
     * Chaque accès est tracé dans AuditLog (RGPD).
     */
    @GetMapping("/{id}/medical-history")
    public ResponseEntity<List<Consultation>> getMedicalHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails currentUser) {
        return ResponseEntity.ok(
                patientService.getMedicalHistory(id, currentUser.getUsername())
        );
    }

    /**
     * POST /api/patient/{id}/documents
     * Téléverse un document externe (résultat labo, radio…) dans le dossier.
     * Body JSON : { "fileName": "...", "fileType": "PDF", "fileUrl": "...", "uploadedAt": "..." }
     *
     * NOTE : Dans la version complète avec FileStorageService,
     * ce endpoint recevra un MultipartFile. Ici on accepte les métadonnées
     * après que le frontend a uploadé le fichier via un endpoint dédié.
     */
    @PostMapping("/{id}/documents")
    public ResponseEntity<Consultation> uploadDocument(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") Long doctorId,
            @RequestBody Map<String, Object> fileMetadata) {
        return ResponseEntity.ok(
                patientService.uploadDocument(id, doctorId, fileMetadata)
        );
    }

    // ── Tiers (enfant / personne dépendante) ──────────────────────────────────

    /**
     * GET /api/patient/{id}/dependents
     * Retourne les patients rattachés à ce tuteur (mineurs, personnes dépendantes).
     * Permet la prise de RDV pour un tiers depuis le même compte.
     */
    @GetMapping("/{id}/dependents")
    public ResponseEntity<List<Patient>> getDependents(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getDependents(id));
    }
}
