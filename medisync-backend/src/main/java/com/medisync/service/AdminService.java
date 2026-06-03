package com.medisync.service;

import com.medisync.model.enums.Permission;
import com.medisync.model.nosql.AuditLog;
import com.medisync.model.sql.*;
import com.medisync.model.enums.Role;
import com.medisync.repository.nosql.AuditLogRepository;
import com.medisync.repository.sql.*;
import com.medisync.util.PasswordPolicy;
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
    private final ClinicProfileRepository clinicProfileRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Gestion des utilisateurs ──────────────────────────────────────────────

    @Transactional
    public User createUser(String firstname, String lastname,
                           String email, String rawPassword, Role role,
                           Set<Permission> extraPermissions) {
        String normalizedEmail = email.trim().toLowerCase();
        PasswordPolicy.validateOrThrow(rawPassword);
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new RuntimeException("Email déjà utilisé : " + normalizedEmail);
        }
        User user = User.builder()
                .firstname(firstname)
                .lastname(lastname)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(rawPassword))
                .role(role)
                .extraPermissions(extraPermissions == null ? new LinkedHashSet<>() : new LinkedHashSet<>(extraPermissions))
                .build();
        User saved = userRepository.save(user);

        // Si médecin, créer le profil Doctor associé
        if (role == Role.DOCTOR) {
            Doctor doctor = new Doctor();
            doctor.setUser(saved);
            doctor.setAvailabilityStart(java.time.LocalTime.of(8, 0));
            doctor.setAvailabilityEnd(java.time.LocalTime.of(18, 0));
            doctor.setWorkingDays("MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY");
            doctor.setDefaultSlotMinutes(30);
            doctorRepository.save(doctor);
        }

        logAudit(null, "CREATE_USER", "User#" + saved.getId() + " role=" + role);
        return saved;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User updateUserPermissions(Long userId, Set<Permission> extraPermissions) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + userId));
        user.setExtraPermissions(extraPermissions == null ? new LinkedHashSet<>() : new LinkedHashSet<>(extraPermissions));
        User saved = userRepository.save(user);
        logAudit(null, "UPDATE_USER_PERMISSIONS", "User#" + saved.getId());
        return saved;
    }

    @Transactional
    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
        logAudit(null, "DELETE_USER", "User#" + userId);
    }

    // ── Gestion des médecins ──────────────────────────────────────────────────

    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    @Transactional
    public Doctor updateDoctor(Long doctorId, String specialty, String bio,
                               String spokenLanguages, Double rate,
                               java.time.LocalTime availabilityStart,
                               java.time.LocalTime availabilityEnd,
                               String workingDays,
                               Integer defaultSlotMinutes) {
        Doctor d = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Médecin introuvable : " + doctorId));
        d.setSpecialty(specialty);
        d.setBio(bio);
        d.setSpokenLanguages(spokenLanguages);
        d.setStandardConsultationRate(rate);
        d.setAvailabilityStart(availabilityStart);
        d.setAvailabilityEnd(availabilityEnd);
        d.setWorkingDays(workingDays);
        d.setDefaultSlotMinutes(defaultSlotMinutes);
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

    public ClinicProfile getClinicProfile() {
        return clinicProfileRepository.findById(1L).orElseGet(this::createDefaultClinicProfile);
    }

    @Transactional
    public ClinicProfile updateClinicProfile(ClinicProfile incoming) {
        ClinicProfile profile = getClinicProfile();
        profile.setName(incoming.getName());
        profile.setAddress(incoming.getAddress());
        profile.setCity(incoming.getCity());
        profile.setPhone(incoming.getPhone());
        profile.setEmail(incoming.getEmail());
        profile.setLatitude(incoming.getLatitude());
        profile.setLongitude(incoming.getLongitude());
        profile.setOpeningHours(incoming.getOpeningHours());
        profile.setSpecialtiesOffered(incoming.getSpecialtiesOffered());
        return clinicProfileRepository.save(profile);
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
        return auditLogRepository.findAll();
    }

    private void logAudit(Long userId, String action, String target) {
        AuditLog log = new AuditLog();
        log.setUserId(userId);
        log.setAction(action);
        log.setTargetEntity(target);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    private ClinicProfile createDefaultClinicProfile() {
        ClinicProfile profile = new ClinicProfile();
        profile.setId(1L);
        profile.setName("Clinique MediSync");
        profile.setAddress("Boulevard de la Santé");
        profile.setCity("Casablanca");
        profile.setPhone("+212 5 22 00 00 00");
        profile.setEmail("contact@medisync.ma");
        profile.setLatitude(33.5731);
        profile.setLongitude(-7.5898);
        profile.setOpeningHours("Lundi - Vendredi: 08:00 - 18:00\nSamedi: 09:00 - 13:00");
        profile.setSpecialtiesOffered("Médecine générale, Cardiologie, Pédiatrie");
        return clinicProfileRepository.save(profile);
    }
}
