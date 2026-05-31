package com.medisync.service;

import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Invoice;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final AppointmentRepository appointmentRepository;

    // ── Génération d'une facture ──────────────────────────────────────────────

    @Transactional
    public Invoice generate(Long appointmentId, Double amount, String paymentMethod) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Rendez-vous introuvable : " + appointmentId));

        // Vérifie qu'il n'existe pas déjà une facture pour ce rendez-vous
        if (appt.getInvoice() != null) {
            throw new RuntimeException("Une facture existe déjà pour ce rendez-vous.");
        }

        Invoice invoice = new Invoice();
        invoice.setAppointment(appt);
        invoice.setTotalAmount(amount);
        invoice.setIssueDate(LocalDateTime.now());
        invoice.setIsPaid(false);
        invoice.setPaymentMethod(paymentMethod);

        return invoiceRepository.save(invoice);
    }

    // ── Marquer comme payée ───────────────────────────────────────────────────

    @Transactional
    public Invoice markAsPaid(Long invoiceId) {
        Invoice invoice = getById(invoiceId);
        invoice.setIsPaid(true);
        return invoiceRepository.save(invoice);
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    public Invoice getById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Facture introuvable : " + id));
    }

    public List<Invoice> getAll() {
        return invoiceRepository.findAll();
    }

    /** Factures impayées — utilisé par la secrétaire */
    public List<Invoice> getUnpaid() {
        return invoiceRepository.findByIsPaidFalse();
    }

    /** Toutes les factures d'un patient */
    public List<Invoice> getByPatient(Long patientId) {
        return invoiceRepository.findAll().stream()
                .filter(i -> i.getAppointment() != null
                        && i.getAppointment().getPatient() != null
                        && i.getAppointment().getPatient().getId().equals(patientId))
                .toList();
    }

    /** Factures émises sur une période (rapport journalier / mensuel) */
    public List<Invoice> getByPeriod(LocalDateTime from, LocalDateTime to) {
        return invoiceRepository.findAll().stream()
                .filter(i -> i.getIssueDate() != null
                        && !i.getIssueDate().isBefore(from)
                        && !i.getIssueDate().isAfter(to))
                .toList();
    }

    /** Chiffre d'affaires sur une période */
    public Double getTotalRevenue(LocalDateTime from, LocalDateTime to) {
        return getByPeriod(from, to).stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsPaid()))
                .mapToDouble(Invoice::getTotalAmount)
                .sum();
    }
}
