package com.medisync.controller;

import com.medisync.model.sql.Appointment;
import com.medisync.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Gestion des rendez-vous — accessible à tous les rôles authentifiés.
 * La granularité des droits est assurée au niveau service (qui peut faire quoi).
 *
 * Routes : /api/appointments/**
 * Sécurité : anyRequest().authenticated() dans SecurityConfig.
 */
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    // ── Création ──────────────────────────────────────────────────────────────

    /**
     * POST /api/appointments
     * Crée un nouveau rendez-vous.
     * Vérifie automatiquement la disponibilité du médecin et de la salle.
     *
     * Body JSON :
     * {
     *   "patientId": 1,
     *   "doctorId": 2,
     *   "roomId": 3,
     *   "dateTime": "2025-06-15T10:30:00",
     *   "durationMinutes": 30,
     *   "appointmentType": "CONSULTATION_GENERALE",
     *   "description": "Suivi annuel"
     * }
     */
    @PostMapping
    public ResponseEntity<Appointment> create(@RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(
                appointmentService.create(
                        request.getPatientId(),
                        request.getDoctorId(),
                        request.getRoomId(),
                        request.getDateTime(),
                        request.getDurationMinutes(),
                        request.getAppointmentType(),
                        request.getDescription()
                )
        );
    }

    // ── Modification ──────────────────────────────────────────────────────────

    /**
     * PUT /api/appointments/{id}
     * Modifie un rendez-vous existant (date, durée, salle).
     * Re-vérifie les disponibilités en excluant le RDV en cours.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Appointment> update(
            @PathVariable Long id,
            @RequestBody AppointmentUpdateRequest request) {
        return ResponseEntity.ok(
                appointmentService.update(
                        id,
                        request.getDateTime(),
                        request.getDurationMinutes(),
                        request.getRoomId()
                )
        );
    }

    // ── Annulation / Confirmation ─────────────────────────────────────────────

    /**
     * PATCH /api/appointments/{id}/cancel
     * Annule un rendez-vous — passe le statut à CANCELLED.
     * Déclenche un log de notification (email à implémenter dans NotificationService).
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Appointment> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.cancel(id));
    }

    /**
     * PATCH /api/appointments/{id}/confirm
     * Confirme un rendez-vous — passe le statut à CONFIRMED.
     */
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<Appointment> confirm(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.confirm(id));
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    /**
     * GET /api/appointments/{id}
     * Récupère un rendez-vous par son ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getById(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.getById(id));
    }

    /**
     * GET /api/appointments
     * Retourne tous les rendez-vous (usage admin / secrétaire).
     */
    @GetMapping
    public ResponseEntity<List<Appointment>> getAll() {
        return ResponseEntity.ok(appointmentService.getAll());
    }

    /**
     * GET /api/appointments/patient/{patientId}
     * Retourne tous les rendez-vous d'un patient spécifique.
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Appointment>> getByPatient(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(appointmentService.getByPatient(patientId));
    }

    // ── DTOs internes ─────────────────────────────────────────────────────────

    /**
     * DTO pour la création d'un rendez-vous.
     * Classe interne statique — évite de créer un fichier séparé pour un DTO simple.
     */
    @lombok.Data
    public static class AppointmentRequest {
        private Long patientId;
        private Long doctorId;
        private Long roomId;

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime dateTime;

        private int durationMinutes;
        private String appointmentType;
        private String description;
    }

    /**
     * DTO pour la modification d'un rendez-vous.
     */
    @lombok.Data
    public static class AppointmentUpdateRequest {
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime dateTime;

        private int durationMinutes;
        private Long roomId;
    }
}
