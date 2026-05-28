package com.medisync.service;

import com.medisync.model.enums.PatientCategory;
import com.medisync.model.enums.Role;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Invoice;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.User;
import com.medisync.repository.sql.InvoiceRepository;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecretaryService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final InvoiceRepository invoiceRepository;
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
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email déjà utilisé : " + email);
        }

        // Crée le User avec un mot de passe temporaire aléatoire
        String tempPassword = UUID.randomUUID().toString().substring(0, 8) + "A1!";
        User user = User.builder()
                .firstname(firstname)
                .lastname(lastname)
                .email(email)
                .password(passwordEncoder.encode(tempPassword))
                .role(Role.PATIENT)
                .build();
        user = userRepository.save(user);

        Patient patient = new Patient();
        patient.setUser(user);
        patient.setFirstName(firstname);
        patient.setLastName(lastname);
        patient.setPhoneNumber(phone);
        patient.setSocialSecurityNumber(ssn);
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

    // ── Facturation ───────────────────────────────────────────────────────────

    public Invoice generateInvoice(Long appointmentId, Double amount, String paymentMethod) {
        return invoiceService.generate(appointmentId, amount, paymentMethod);
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
}
