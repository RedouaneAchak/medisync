package com.medisync.controller;

import com.medisync.model.sql.Invoice;
import com.medisync.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Consultation des factures et rapports financiers.
 * Routes : /api/invoices/**
 *
 * Accès :
 *  - SECRETARY : génération et paiement (via SecretaryController)
 *  - PATIENT   : ses propres factures
 *  - ADMIN     : vue complète + rapports financiers
 */
@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    // ── Lecture ───────────────────────────────────────────────────────────────

    /**
     * GET /api/invoices/{id}
     * Récupère une facture par son ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getById(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getById(id));
    }

    /**
     * GET /api/invoices
     * Toutes les factures — accès admin et secrétaire.
     */
    @GetMapping
    public ResponseEntity<List<Invoice>> getAll() {
        return ResponseEntity.ok(invoiceService.getAll());
    }

    /**
     * GET /api/invoices/patient/{patientId}
     * Toutes les factures d'un patient (accessible au patient lui-même et à l'admin).
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Invoice>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(invoiceService.getByPatient(patientId));
    }

    /**
     * GET /api/invoices/unpaid
     * Factures impayées — suivi des créances pour la secrétaire.
     */
    @GetMapping("/unpaid")
    public ResponseEntity<List<Invoice>> getUnpaid() {
        return ResponseEntity.ok(invoiceService.getUnpaid());
    }

    // ── Rapports financiers ───────────────────────────────────────────────────

    /**
     * GET /api/invoices/report?from=2025-06-01T00:00&to=2025-06-30T23:59
     * Factures émises sur une période donnée — rapport financier périodique.
     */
    @GetMapping("/report")
    public ResponseEntity<List<Invoice>> getByPeriod(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(invoiceService.getByPeriod(from, to));
    }

    /**
     * GET /api/invoices/revenue?from=2025-01-01T00:00&to=2025-12-31T23:59
     * Chiffre d'affaires total encaissé sur une période.
     * Retourne un simple Double — utilisé par le dashboard admin.
     */
    @GetMapping("/revenue")
    public ResponseEntity<Double> getRevenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(invoiceService.getTotalRevenue(from, to));
    }
}
