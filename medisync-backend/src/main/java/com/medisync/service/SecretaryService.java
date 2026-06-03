package com.medisync.service;

import com.medisync.model.enums.PatientCategory;
import com.medisync.model.enums.Role;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.CareSheet;
import com.medisync.model.sql.Invoice;
import com.medisync.model.sql.MedicalAct;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.User;
import com.medisync.repository.sql.CareSheetRepository;
import com.medisync.repository.sql.InvoiceRepository;
import com.medisync.repository.sql.MedicalActRepository;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.UserRepository;
import com.medisync.util.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecretaryService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final InvoiceRepository invoiceRepository;
    private final MedicalActRepository medicalActRepository;
    private final CareSheetRepository careSheetRepository;
    private final AppointmentService appointmentService;
    private final InvoiceService invoiceService;
    private final PasswordEncoder passwordEncoder;

    // ── Création d'un compte patient ─────────────────────────────────────────

    /**
     * La secrétaire crée le compte d'un patient qui n'est pas encore inscrit.
     */
    @Transactional
    public Patient createPatientAccount(String firstname, String lastname,
                                        String email, String phone,
                                        String ssn, PatientCategory category,
                                        String companyName) {
        String normalizedSsn = normalizeSsn(ssn);
        String normalizedEmail = email != null && !email.isBlank()
                ? email.trim().toLowerCase()
                : normalizedSsn == null ? null : "patient-" + normalizedSsn + "@medisync.local";

        if (normalizedEmail == null) {
            throw new RuntimeException("Veuillez renseigner un email ou un numéro de sécurité sociale.");
        }
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new RuntimeException("Email déjà utilisé : " + normalizedEmail);
        }
        if (normalizedSsn != null && patientRepository.findBySocialSecurityNumber(normalizedSsn).isPresent()) {
            throw new RuntimeException("Numéro de sécurité sociale déjà utilisé : " + normalizedSsn);
        }

        // Crée le User avec un mot de passe temporaire aléatoire
        String tempPassword = UUID.randomUUID().toString().substring(0, 8) + "A1!";
        PasswordPolicy.validateOrThrow(tempPassword);
        User user = User.builder()
                .firstname(firstname)
                .lastname(lastname)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(tempPassword))
                .role(Role.PATIENT)
                .build();
        user = userRepository.save(user);

        Patient patient = new Patient();
        patient.setUser(user);
        patient.setFirstName(firstname);
        patient.setLastName(lastname);
        patient.setPhoneNumber(phone);
        patient.setSocialSecurityNumber(normalizedSsn);
        patient.setCategory(category);
        patient.setCompanyName(companyName);

        return patientRepository.save(patient);
    }

    // ── Gestion des rendez-vous ────────────────────────────────────────────────

    public Appointment createAppointment(Long patientId, Long doctorId, Long roomId,
                                         java.time.LocalDateTime dateTime, int duration,
                                         String type, String description) {
        return appointmentService.create(patientId, doctorId, roomId,
                dateTime, duration, type, description);
    }

    public Appointment cancelAppointment(Long appointmentId) {
        return appointmentService.cancel(appointmentId);
    }

    public Appointment confirmAppointment(Long appointmentId) {
        return appointmentService.confirm(appointmentId);
    }

    public List<Appointment> getAllAppointments() {
        return appointmentService.getAll();
    }

    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    @Transactional
    public CareSheet generateCareSheet(Long appointmentId, Long medicalActId, Double amount, String notes) {
        Appointment appointment = appointmentService.getById(appointmentId);
        MedicalAct medicalAct = medicalActRepository.findById(medicalActId)
                .orElseThrow(() -> new RuntimeException("Acte médical introuvable : " + medicalActId));

        CareSheet careSheet = new CareSheet();
        careSheet.setAppointment(appointment);
        careSheet.setMedicalAct(medicalAct);
        careSheet.setAmount(amount != null && amount > 0 ? amount : medicalAct.getBaseTariff());
        careSheet.setNotes(notes);
        careSheet.setStatus("DRAFT");
        careSheet.setCreatedAt(LocalDateTime.now());
        return careSheetRepository.save(careSheet);
    }

    public List<CareSheet> getAllCareSheets() {
        return careSheetRepository.findAllByOrderByCreatedAtDesc();
    }

    // ── Facturation ───────────────────────────────────────────────────────────

    public Invoice generateInvoice(Long appointmentId, Double amount, String paymentMethod) {
        return invoiceService.generate(appointmentId, amount, paymentMethod);
    }

    @Transactional
    public Invoice generateInvoiceFromCareSheet(Long careSheetId, String paymentMethod) {
        CareSheet careSheet = careSheetRepository.findById(careSheetId)
                .orElseThrow(() -> new RuntimeException("Feuille de soins introuvable : " + careSheetId));
        Invoice invoice = invoiceService.generate(
                careSheet.getAppointment().getId(),
                careSheet.getAmount(),
                paymentMethod
        );
        careSheet.setStatus("INVOICED");
        careSheetRepository.save(careSheet);
        return invoice;
    }

    public Invoice markInvoicePaid(Long invoiceId) {
        return invoiceService.markAsPaid(invoiceId);
    }

    public List<Invoice> getUnpaidInvoices() {
        return invoiceService.getUnpaid();
    }

    public List<Invoice> getAllInvoices() {
        return invoiceService.getAll();
    }

    private String normalizeSsn(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.replaceAll("\\s+", "").trim();
    }
}
