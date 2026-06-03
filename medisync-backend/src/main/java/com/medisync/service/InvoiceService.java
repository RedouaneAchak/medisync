package com.medisync.service;

import com.medisync.dto.FinancialReportPointDto;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Invoice;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final AppointmentRepository appointmentRepository;
    private final NotificationEmailService notificationEmailService;

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

        Invoice saved = invoiceRepository.save(invoice);
        notificationEmailService.sendInvoice(saved);
        return saved;
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

    public List<FinancialReportPointDto> getRevenueSummary(LocalDateTime from, LocalDateTime to, String granularity) {
        DateTimeFormatter formatter = switch (normalizeGranularity(granularity)) {
            case "YEAR" -> DateTimeFormatter.ofPattern("yyyy");
            case "MONTH" -> DateTimeFormatter.ofPattern("yyyy-MM");
            default -> DateTimeFormatter.ofPattern("yyyy-MM-dd");
        };

        Map<String, double[]> buckets = new LinkedHashMap<>();
        for (Invoice invoice : getByPeriod(from, to)) {
            if (invoice.getIssueDate() == null) {
                continue;
            }
            String key = invoice.getIssueDate().format(formatter);
            double[] values = buckets.computeIfAbsent(key, unused -> new double[] {0d, 0d, 0d});
            values[1] += 1;
            if (Boolean.TRUE.equals(invoice.getIsPaid())) {
                values[0] += invoice.getTotalAmount();
                values[2] += 1;
            }
        }

        return buckets.entrySet().stream()
                .sorted(Comparator.comparing(Map.Entry::getKey))
                .map(entry -> FinancialReportPointDto.builder()
                        .label(entry.getKey())
                        .revenue(entry.getValue()[0])
                        .invoiceCount((long) entry.getValue()[1])
                        .paidInvoiceCount((long) entry.getValue()[2])
                        .build())
                .toList();
    }

    public Invoice sendInvoiceEmail(Long invoiceId) {
        Invoice invoice = getById(invoiceId);
        notificationEmailService.sendInvoice(invoice);
        return invoice;
    }

    private String normalizeGranularity(String granularity) {
        String normalized = granularity == null ? "DAY" : granularity.trim().toUpperCase();
        if (!List.of("DAY", "MONTH", "YEAR").contains(normalized)) {
            throw new RuntimeException("Granularité invalide. Utilisez DAY, MONTH ou YEAR.");
        }
        return normalized;
    }
}
