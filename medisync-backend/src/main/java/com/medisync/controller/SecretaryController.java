package com.medisync.controller;

import com.medisync.model.enums.PatientCategory;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.CareSheet;
import com.medisync.model.sql.Invoice;
import com.medisync.model.sql.Patient;
import com.medisync.service.SecretaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Espace secrétaire — accessible aux rôles SECRETARY et ADMIN.
 * Routes protégées par SecurityConfig : /api/secretary/**
 */
@RestController
@RequestMapping("/api/secretary")
@RequiredArgsConstructor
public class SecretaryController {

    private final SecretaryService secretaryService;

    // ── Gestion des patients ──────────────────────────────────────────────────

    /**
     * POST /api/secretary/patients
     * Crée un compte patient pour un patient non encore inscrit (walk-in).
     * Génère un mot de passe temporaire envoyé par email.
     *
     * Body JSON :
     * {
     *   "firstname": "Jean",
     *   "lastname": "Dupont",
     *   "email": "jean.dupont@email.com",
     *   "phone": "0612345678",
     *   "ssn": "1 85 06 75 123 456 78",
     *   "category": "ADULT",
     *   "companyName": null
     * }
     */
    @PostMapping("/patients")
    public ResponseEntity<Patient> createPatient(
            @RequestBody PatientCreateRequest request) {
        return ResponseEntity.ok(
                secretaryService.createPatientAccount(
                        request.getFirstname(),
                        request.getLastname(),
                        request.getEmail(),
                        request.getPhone(),
                        request.getSsn(),
                        request.getCategory(),
                        request.getCompanyName()
                )
        );
    }

    @GetMapping("/patients")
    public ResponseEntity<List<Patient>> getAllPatients() {
        return ResponseEntity.ok(secretaryService.getAllPatients());
    }

    @PostMapping("/care-sheets")
    public ResponseEntity<CareSheet> createCareSheet(@RequestBody CareSheetCreateRequest request) {
        return ResponseEntity.ok(
                secretaryService.generateCareSheet(
                        request.getAppointmentId(),
                        request.getMedicalActId(),
                        request.getAmount(),
                        request.getNotes()
                )
        );
    }

    @GetMapping("/care-sheets")
    public ResponseEntity<List<CareSheet>> getAllCareSheets() {
        return ResponseEntity.ok(secretaryService.getAllCareSheets());
    }

    // ── Gestion des rendez-vous ────────────────────────────────────────────────

    /**
     * GET /api/secretary/appointments
     * Vue complète de tous les rendez-vous — tableau de bord secrétaire.
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        return ResponseEntity.ok(secretaryService.getAllAppointments());
    }

    /**
     * POST /api/secretary/appointments
     * Crée un rendez-vous pour le compte d'un patient.
     */
    @PostMapping("/appointments")
    public ResponseEntity<Appointment> createAppointment(
            @RequestBody AppointmentCreateRequest request) {
        return ResponseEntity.ok(
                secretaryService.createAppointment(
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

    /**
     * PATCH /api/secretary/appointments/{id}/cancel
     * Annule un rendez-vous.
     */
    @PatchMapping("/appointments/{id}/cancel")
    public ResponseEntity<Appointment> cancelAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(secretaryService.cancelAppointment(id));
    }

    /**
     * PATCH /api/secretary/appointments/{id}/confirm
     * Confirme un rendez-vous.
     */
    @PatchMapping("/appointments/{id}/confirm")
    public ResponseEntity<Appointment> confirmAppointment(@PathVariable Long id) {
        return ResponseEntity.ok(secretaryService.confirmAppointment(id));
    }

    // ── Facturation ───────────────────────────────────────────────────────────

    /**
     * POST /api/secretary/invoices
     * Génère une facture pour un rendez-vous réalisé.
     * Une seule facture par rendez-vous (vérifié côté service).
     *
     * Body JSON :
     * { "appointmentId": 5, "amount": 25.0, "paymentMethod": "CASH" }
     */
    @PostMapping("/invoices")
    public ResponseEntity<Invoice> generateInvoice(
            @RequestBody InvoiceCreateRequest request) {
        return ResponseEntity.ok(
                secretaryService.generateInvoice(
                        request.getAppointmentId(),
                        request.getAmount(),
                        request.getPaymentMethod()
                )
        );
    }

    /**
     * PATCH /api/secretary/invoices/{id}/pay
     * Marque une facture comme payée après encaissement.
     */
    @PatchMapping("/invoices/{id}/pay")
    public ResponseEntity<Invoice> markInvoicePaid(@PathVariable Long id) {
        return ResponseEntity.ok(secretaryService.markInvoicePaid(id));
    }

    @PostMapping("/care-sheets/{id}/invoice")
    public ResponseEntity<Invoice> generateInvoiceFromCareSheet(
            @PathVariable Long id,
            @RequestBody CareSheetInvoiceRequest request) {
        return ResponseEntity.ok(secretaryService.generateInvoiceFromCareSheet(id, request.getPaymentMethod()));
    }

    /**
     * GET /api/secretary/invoices/unpaid
     * Liste toutes les factures impayées pour le suivi des créances.
     */
    @GetMapping("/invoices/unpaid")
    public ResponseEntity<List<Invoice>> getUnpaidInvoices() {
        return ResponseEntity.ok(secretaryService.getUnpaidInvoices());
    }

    /**
     * GET /api/secretary/invoices
     * Liste toutes les factures (historique complet).
     */
    @GetMapping("/invoices")
    public ResponseEntity<List<Invoice>> getAllInvoices() {
        return ResponseEntity.ok(secretaryService.getAllInvoices());
    }

    // ── DTOs internes ─────────────────────────────────────────────────────────

    @lombok.Data
    public static class PatientCreateRequest {
        private String firstname;
        private String lastname;
        private String email;
        private String phone;
        private String ssn;
        private PatientCategory category;
        private String companyName;
    }

    @lombok.Data
    public static class AppointmentCreateRequest {
        private Long patientId;
        private Long doctorId;
        private Long roomId;

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime dateTime;

        private int durationMinutes;
        private String appointmentType;
        private String description;
    }

    @lombok.Data
    public static class CareSheetCreateRequest {
        private Long appointmentId;
        private Long medicalActId;
        private Double amount;
        private String notes;
    }

    @lombok.Data
    public static class InvoiceCreateRequest {
        private Long appointmentId;
        private Double amount;
        private String paymentMethod;
    }

    @lombok.Data
    public static class CareSheetInvoiceRequest {
        private String paymentMethod;
    }
}
