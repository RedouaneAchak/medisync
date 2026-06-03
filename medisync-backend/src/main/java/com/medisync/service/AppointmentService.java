package com.medisync.service;

import com.medisync.model.nosql.NotificationLog;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Doctor;
import com.medisync.model.sql.DoctorUnavailability;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.Room;
import com.medisync.repository.nosql.NotificationLogRepository;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.DoctorRepository;
import com.medisync.repository.sql.DoctorUnavailabilityRepository;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorUnavailabilityRepository doctorUnavailabilityRepository;
    private final RoomRepository roomRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final NotificationEmailService notificationEmailService;

    // ── Création ──────────────────────────────────────────────────────────────

    @Transactional
    public Appointment create(Long patientId, Long doctorId, Long roomId,
                              LocalDateTime dateTime, int durationMinutes,
                              String appointmentType, String description) {
        validateDuration(durationMinutes);

        checkDoctorAvailability(doctorId, dateTime, durationMinutes, null);
        checkRoomAvailability(roomId, dateTime, durationMinutes, null);

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient introuvable : " + patientId));
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Médecin introuvable : " + doctorId));
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Salle introuvable : " + roomId));

        Appointment appt = new Appointment();
        appt.setPatient(patient);
        appt.setDoctor(doctor);
        appt.setRoom(room);
        appt.setDateTime(dateTime);
        appt.setDurationMinutes(durationMinutes);
        appt.setAppointmentType(appointmentType);
        appt.setDescription(description);
        appt.setStatus("PENDING");

        Appointment saved = appointmentRepository.save(appt);
        saveNotification(saved.getId(), patientId, "APPOINTMENT_CREATED");
        return saved;
    }

    // ── Modification ──────────────────────────────────────────────────────────

    @Transactional
    public Appointment update(Long appointmentId, LocalDateTime newDateTime,
                              int newDuration, Long newRoomId) {
        validateDuration(newDuration);

        Appointment appt = getById(appointmentId);
        checkDoctorAvailability(appt.getDoctor().getId(), newDateTime, newDuration, appointmentId);
        checkRoomAvailability(newRoomId, newDateTime, newDuration, appointmentId);

        appt.setDateTime(newDateTime);
        appt.setDurationMinutes(newDuration);

        if (newRoomId != null) {
            Room room = roomRepository.findById(newRoomId)
                    .orElseThrow(() -> new RuntimeException("Salle introuvable : " + newRoomId));
            appt.setRoom(room);
        }

        Appointment saved = appointmentRepository.save(appt);
        saveNotification(saved.getId(), appt.getPatient().getId(), "APPOINTMENT_UPDATED");
        return saved;
    }

    // ── Annulation ────────────────────────────────────────────────────────────

    @Transactional
    public Appointment cancel(Long appointmentId) {
        Appointment appt = getById(appointmentId);
        appt.setStatus("CANCELLED");
        Appointment saved = appointmentRepository.save(appt);
        saveNotification(saved.getId(), appt.getPatient().getId(), "APPOINTMENT_CANCELLED");
        return saved;
    }

    // ── Confirmation ──────────────────────────────────────────────────────────

    @Transactional
    public Appointment confirm(Long appointmentId) {
        Appointment appt = getById(appointmentId);
        appt.setStatus("CONFIRMED");
        Appointment saved = appointmentRepository.save(appt);
        saveNotification(saved.getId(), appt.getPatient().getId(), "APPOINTMENT_CONFIRMED");
        return saved;
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    public Appointment getById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rendez-vous introuvable : " + id));
    }

    public List<Appointment> getAll() {
        return appointmentRepository.findAll();
    }

    public List<Appointment> getByPatient(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    // ── Disponibilités ────────────────────────────────────────────────────────

    private void checkDoctorAvailability(Long doctorId, LocalDateTime dateTime,
                                         int duration, Long excludeId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Médecin introuvable : " + doctorId));
        ensureInsideWorkingWindow(doctor, dateTime, duration);

        LocalDateTime end = dateTime.plusMinutes(duration);
        List<DoctorUnavailability> blocked = doctorUnavailabilityRepository.findOverlapping(doctorId, dateTime, end);
        if (!blocked.isEmpty()) {
            throw new RuntimeException("Médecin indisponible sur ce créneau.");
        }

        List<Appointment> conflicts = appointmentRepository
                .findByDoctorIdAndDateTimeBetween(doctorId, dateTime.minusDays(1), end.plusDays(1));
        conflicts.removeIf(a -> a.getId().equals(excludeId));
        conflicts.removeIf(a -> !overlaps(dateTime, duration, a.getDateTime(), a.getDurationMinutes()));
        if (!conflicts.isEmpty())
            throw new RuntimeException("Médecin non disponible sur ce créneau.");
    }

    private void checkRoomAvailability(Long roomId, LocalDateTime dateTime,
                                       int duration, Long excludeId) {
        if (roomId == null) return;
        LocalDateTime end = dateTime.plusMinutes(duration);
        List<Appointment> conflicts = appointmentRepository
                .findByRoomIdAndDateTimeBetween(roomId, dateTime.minusDays(1), end.plusDays(1));
        conflicts.removeIf(a -> a.getId().equals(excludeId));
        conflicts.removeIf(a -> !overlaps(dateTime, duration, a.getDateTime(), a.getDurationMinutes()));
        if (!conflicts.isEmpty())
            throw new RuntimeException("Salle occupée sur ce créneau.");
    }

    // ── Notification ─────────────────────────────────────────────────────────

    private void saveNotification(Long appointmentId, Long patientId, String type) {
        CompletableFuture.runAsync(() -> {
            try {
                Appointment appointment = getById(appointmentId);
                NotificationLog n = new NotificationLog();
                n.setAppointmentId(appointmentId);
                n.setPatientId(patientId);
                n.setType(type);
                n.setSentAt(LocalDateTime.now());
                notificationLogRepository.save(n);
                notificationEmailService.sendAppointmentEvent(appointment, type);
            } catch (Exception ex) {
                System.err.println("Notification log skipped: " + ex.getMessage());
            }
        });
    }

    private boolean overlaps(LocalDateTime candidateStart, int candidateDuration, LocalDateTime existingStart, int existingDuration) {
        LocalDateTime candidateEnd = candidateStart.plusMinutes(candidateDuration);
        LocalDateTime existingEnd = existingStart.plusMinutes(existingDuration > 0 ? existingDuration : 30);
        return candidateStart.isBefore(existingEnd) && candidateEnd.isAfter(existingStart);
    }

    private void validateDuration(int durationMinutes) {
        if (!List.of(15, 30, 60).contains(durationMinutes)) {
            throw new RuntimeException("Le système ne gère que des créneaux de 15, 30 ou 60 minutes.");
        }
    }

    private void ensureInsideWorkingWindow(Doctor doctor, LocalDateTime dateTime, int duration) {
        if (doctor.getWorkingDays() != null && !doctor.getWorkingDays().isBlank()) {
            List<String> days = java.util.Arrays.stream(doctor.getWorkingDays().split(","))
                    .map(String::trim)
                    .map(String::toUpperCase)
                    .collect(Collectors.toList());
            if (!days.contains(dateTime.getDayOfWeek().name())) {
                throw new RuntimeException("Ce médecin n'est pas disponible ce jour-là.");
            }
        }

        LocalTime start = doctor.getAvailabilityStart() != null ? doctor.getAvailabilityStart() : LocalTime.of(8, 0);
        LocalTime end = doctor.getAvailabilityEnd() != null ? doctor.getAvailabilityEnd() : LocalTime.of(18, 0);
        LocalTime requestedStart = dateTime.toLocalTime();
        LocalTime requestedEnd = requestedStart.plusMinutes(duration);
        if (requestedStart.isBefore(start) || requestedEnd.isAfter(end)) {
            throw new RuntimeException("Ce créneau est hors des horaires de disponibilité du médecin.");
        }
    }
}
