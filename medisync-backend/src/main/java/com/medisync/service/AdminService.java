package com.medisync.service;

import com.medisync.model.nosql.AuditLog;
import com.medisync.model.sql.*;
import com.medisync.model.enums.Role;
import com.medisync.repository.nosql.AuditLogRepository;
import com.medisync.repository.nosql.ConsultationRepository;
import com.medisync.repository.sql.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final RoomRepository roomRepository;
    private final ConsultationRepository consultationRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Gestion des utilisateurs ──────────────────────────────────────────────

    @Transactional
    public User createUser(String firstname, String lastname,
                           String email, String rawPassword, Role role) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email déjà utilisé : " + email);
        }
        User user = User.builder()
                .firstname(firstname)
                .lastname(lastname)
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .role(role)
                .build();
        User saved = userRepository.save(user);

        // Si médecin, créer le profil Doctor associé
        if (role == Role.DOCTOR) {
            Doctor doctor = new Doctor();
            doctor.setUser(saved);
            doctorRepository.save(doctor);
        }

        logAudit(null, "CREATE_USER", "User#" + saved.getId() + " role=" + role);
        return saved;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + userId));

        if (user.getRole() == Role.PATIENT) {
            deletePatientAccount(user);
        } else {
            userRepository.delete(user);
        }

        logAudit(null, "DELETE_USER", "User#" + userId);
    }

    private void deletePatientAccount(User user) {
        Optional<Patient> patientOptional = patientRepository.findById(user.getId());
        if (patientOptional.isEmpty()) {
            userRepository.delete(user);
            return;
        }

        Patient patient = patientOptional.get();
        Long patientId = patient.getId();

        patientRepository.findByGuardianId(patientId).forEach(dependent -> {
            dependent.setGuardian(null);
            patientRepository.save(dependent);
        });

        List<Appointment> appointments = appointmentRepository.findByPatientId(patientId);
        List<Long> appointmentIds = appointments.stream()
                .map(Appointment::getId)
                .filter(Objects::nonNull)
                .toList();

        if (!appointmentIds.isEmpty()) {
            invoiceRepository.deleteAll(invoiceRepository.findByAppointmentIdIn(appointmentIds));
        }

        appointmentRepository.deleteAll(appointments);
        consultationRepository.deleteByPatientId(patientId);
        patientRepository.delete(patient);
        userRepository.delete(user);
    }

    // ── Gestion des médecins ──────────────────────────────────────────────────

    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    @Transactional
    public Doctor updateDoctor(Long doctorId, String specialty, String bio,
                               String spokenLanguages, Double rate) {
        Doctor d = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Médecin introuvable : " + doctorId));
        d.setSpecialty(specialty);
        d.setBio(bio);
        d.setSpokenLanguages(spokenLanguages);
        d.setStandardConsultationRate(rate);
        return doctorRepository.save(d);
    }

    // ── Gestion des salles ────────────────────────────────────────────────────

    public Room createRoom(String roomNumber, String equipmentType) {
        Room room = new Room();
        room.setRoomNumber(roomNumber);
        room.setEquipmentType(equipmentType);
        return roomRepository.save(room);
    }

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    @Transactional
    public void deleteRoom(Long roomId) {
        roomRepository.deleteById(roomId);
    }

    // ── Tableau de bord / Statistiques ───────────────────────────────────────

    /**
     * Indicateurs clés : consultations, revenus, taux de no-show, occupation des salles.
     */
    public Map<String, Object> getDashboard(LocalDateTime from, LocalDateTime to) {
        Map<String, Object> stats = new LinkedHashMap<>();

        List<Appointment> allAppts = appointmentRepository.findAll().stream()
                .filter(a -> a.getDateTime() != null
                        && !a.getDateTime().isBefore(from)
                        && !a.getDateTime().isAfter(to))
                .toList();

        long total      = allAppts.size();
        long cancelled  = allAppts.stream().filter(a -> "CANCELLED".equals(a.getStatus())).count();
        long confirmed  = allAppts.stream().filter(a -> "CONFIRMED".equals(a.getStatus())).count();

        stats.put("totalAppointments", total);
        stats.put("confirmedAppointments", confirmed);
        stats.put("cancelledAppointments", cancelled);
        stats.put("noShowRate", total > 0 ? (double) cancelled / total * 100 : 0);

        // Revenus sur la période
        double revenue = invoiceRepository.findAll().stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsPaid())
                        && i.getIssueDate() != null
                        && !i.getIssueDate().isBefore(from)
                        && !i.getIssueDate().isAfter(to))
                .mapToDouble(Invoice::getTotalAmount)
                .sum();
        stats.put("totalRevenue", revenue);

        // Impayés
        stats.put("unpaidInvoices", invoiceRepository.findByIsPaidFalse().size());

        // Consultations par médecin
        Map<String, Long> perDoctor = new LinkedHashMap<>();
        allAppts.forEach(a -> {
            if (a.getDoctor() != null && a.getDoctor().getUser() != null) {
                String name = a.getDoctor().getUser().getFirstname()
                        + " " + a.getDoctor().getUser().getLastname();
                perDoctor.merge(name, 1L, Long::sum);
            }
        });
        stats.put("appointmentsPerDoctor", perDoctor);

        // Occupation des salles
        Map<String, Long> perRoom = new LinkedHashMap<>();
        allAppts.forEach(a -> {
            if (a.getRoom() != null) {
                perRoom.merge(a.getRoom().getRoomNumber(), 1L, Long::sum);
            }
        });
        stats.put("roomOccupancy", perRoom);

        return stats;
    }

    // ── Journal d'audit ───────────────────────────────────────────────────────

    public List<AuditLog> getAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    private void logAudit(Long userId, String action, String target) {
        AuditLog log = new AuditLog();
        log.setUserId(userId);
        log.setAction(action);
        log.setTargetEntity(target);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }
}
