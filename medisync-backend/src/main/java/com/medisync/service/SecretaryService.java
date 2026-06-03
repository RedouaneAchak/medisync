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
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class SecretaryService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{10,72}$");

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final InvoiceRepository invoiceRepository;
    private final AppointmentService appointmentService;
    private final InvoiceService invoiceService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Patient createPatientAccount(String firstname, String lastname,
                                        String email, String phone,
                                        String ssn, PatientCategory category,
                                        String companyName, String password) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) {
            throw new RuntimeException("Adresse email invalide.");
        }
        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            throw new RuntimeException("Mot de passe faible : 10 caracteres minimum avec majuscule, minuscule, chiffre et caractere special.");
        }
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new RuntimeException("Email deja utilise : " + normalizedEmail);
        }

        String cleanFirstName = firstname == null ? "" : firstname.trim();
        String cleanLastName = lastname == null ? "" : lastname.trim();
        User user = User.builder()
                .firstname(cleanFirstName)
                .lastname(cleanLastName)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password))
                .role(Role.PATIENT)
                .build();
        user = userRepository.save(user);

        Patient patient = new Patient();
        patient.setUser(user);
        patient.setFirstName(cleanFirstName);
        patient.setLastName(cleanLastName);
        patient.setPhoneNumber(phone);
        patient.setSocialSecurityNumber(ssn);
        patient.setCategory(category);
        patient.setCompanyName(companyName);

        return patientRepository.save(patient);
    }

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
