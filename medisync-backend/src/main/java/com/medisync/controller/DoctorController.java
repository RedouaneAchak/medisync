package com.medisync.controller;

import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Doctor;
import com.medisync.model.sql.DoctorUnavailability;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.User;
import com.medisync.service.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Espace médecin — accessible aux rôles DOCTOR et ADMIN.
 * Routes protégées par SecurityConfig : /api/doctor/**
 */
@RestController
@RequestMapping("/api/doctor")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    // ── Recherche de médecins (accès patient aussi) ───────────────────────────

    /**
     * GET /api/doctor
     * Retourne tous les médecins de l'établissement.
     */
    @GetMapping
    public ResponseEntity<List<Doctor>> getAll() {
        return ResponseEntity.ok(doctorService.getAll());
    }

    /**
     * GET /api/doctor/{id}
     * Récupère le profil d'un médecin par son ID.
     */
    @GetMapping("/{id:\\d+}")
    public ResponseEntity<Doctor> getById(@PathVariable Long id) {
        return ResponseEntity.ok(doctorService.getById(id));
    }

    /**
     * GET /api/doctor/search?specialty=Cardiologie
     * Recherche de médecins par spécialité (insensible à la casse).
     */
@GetMapping("/search")
public ResponseEntity<List<Doctor>> searchDoctors(
        // @RequestParam pulls the ?specialty= and ?q= directly from the Angular URL
        @RequestParam(required = false) String specialty,
        @RequestParam(required = false) String q
) {
    return ResponseEntity.ok(doctorService.searchDoctors(specialty, q));
}

    // ── Disponibilités ────────────────────────────────────────────────────────

    /**
     * GET /api/doctor/{id}/available-slots?date=2025-06-15&duration=30
     * Retourne les créneaux libres d'un médecin pour une date donnée.
     * durationMinutes : 15, 30 ou 60 (selon le type d'acte).
     */
    @GetMapping("/{id}/available-slots")
    public ResponseEntity<List<LocalDateTime>> getAvailableSlots(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "30") int duration) {
        return ResponseEntity.ok(
                doctorService.getAvailableSlots(id, date, duration)
        );
    }

    // ── Planning ──────────────────────────────────────────────────────────────

    /**
     * GET /api/doctor/{id}/appointments/today
     * Liste des patients attendus aujourd'hui — vue journalière du médecin.
     */
    @GetMapping("/{id}/appointments/today")
    public ResponseEntity<List<Appointment>> getTodayAppointments(
            @PathVariable Long id) {
        return ResponseEntity.ok(doctorService.getTodayAppointments(id));
    }

    /**
     * GET /api/doctor/{id}/appointments?from=2025-06-01T00:00&to=2025-06-30T23:59
     * Planning hebdomadaire ou mensuel du médecin.
     */
    @GetMapping("/{id}/appointments")
    public ResponseEntity<List<Appointment>> getAppointmentsBetween(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(
                doctorService.getAppointmentsBetween(id, from, to)
        );
    }

    @GetMapping("/{id}/unavailabilities")
    public ResponseEntity<List<DoctorUnavailability>> getUnavailabilities(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        assertDoctorManagementAccess(currentUser, id);
        return ResponseEntity.ok(doctorService.getUnavailabilities(id));
    }

    @PostMapping("/{id}/unavailabilities")
    public ResponseEntity<DoctorUnavailability> addUnavailability(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser,
            @RequestBody DoctorUnavailabilityRequest request) {
        assertDoctorManagementAccess(currentUser, id);
        return ResponseEntity.ok(
                doctorService.addUnavailability(
                        id,
                        request.getStartDateTime(),
                        request.getEndDateTime(),
                        request.getReason(),
                        request.getType()
                )
        );
    }

    @DeleteMapping("/{id}/unavailabilities/{unavailabilityId}")
    public ResponseEntity<Void> deleteUnavailability(
            @PathVariable Long id,
            @PathVariable Long unavailabilityId,
            @AuthenticationPrincipal User currentUser) {
        assertDoctorManagementAccess(currentUser, id);
        doctorService.deleteUnavailability(id, unavailabilityId);
        return ResponseEntity.noContent().build();
    }

    // ── Profil médecin ────────────────────────────────────────────────────────

    /**
     * PUT /api/doctor/{id}
     * Met à jour le profil du médecin (spécialité, bio, langues, tarif).
     */
    @PutMapping("/{id}")
    public ResponseEntity<Doctor> updateProfile(
            @PathVariable Long id,
            @RequestBody Doctor updated) {
        return ResponseEntity.ok(doctorService.updateProfile(id, updated));
    }

    // ── Dossier patient (accès médecin) ───────────────────────────────────────

    /**
     * GET /api/doctor/patient/{patientId}
     * Accès au dossier complet d'un patient pendant la consultation.
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<Patient> getPatientRecord(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(doctorService.getPatientRecord(patientId));
    }

    private void assertDoctorManagementAccess(User currentUser, Long doctorId) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        if ("ADMIN".equals(currentUser.getRole().name())) {
            return;
        }
        if (!"DOCTOR".equals(currentUser.getRole().name()) || !currentUser.getId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé à ce planning médecin.");
        }
    }

    @lombok.Data
    public static class DoctorUnavailabilityRequest {
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime startDateTime;

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime endDateTime;

        private String reason;
        private String type;
    }
}
