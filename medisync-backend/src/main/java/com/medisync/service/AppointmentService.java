package com.medisync.service;

import com.medisync.model.nosql.NotificationLog;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Doctor;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.Room;
import com.medisync.repository.nosql.NotificationLogRepository;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.DoctorRepository;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final RoomRepository roomRepository;
    private final NotificationLogRepository notificationLogRepository;

    // ── Création ──────────────────────────────────────────────────────────────

    @Transactional
    public Appointment create(Long patientId, Long doctorId, Long roomId,
                              LocalDateTime dateTime, int durationMinutes,
                              String appointmentType, String description) {

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
        return appointmentRepository.save(appt);
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
        List<Appointment> conflicts = appointmentRepository
                .findByDoctorIdAndDateTimeBetween(doctorId, dateTime, dateTime.plusMinutes(duration));
        conflicts.removeIf(a -> a.getId().equals(excludeId));
        if (!conflicts.isEmpty())
            throw new RuntimeException("Médecin non disponible sur ce créneau.");
    }

    private void checkRoomAvailability(Long roomId, LocalDateTime dateTime,
                                       int duration, Long excludeId) {
        if (roomId == null) return;
        List<Appointment> conflicts = appointmentRepository
                .findByRoomIdAndDateTimeBetween(roomId, dateTime, dateTime.plusMinutes(duration));
        conflicts.removeIf(a -> a.getId().equals(excludeId));
        if (!conflicts.isEmpty())
            throw new RuntimeException("Salle occupée sur ce créneau.");
    }

    // ── Notification ─────────────────────────────────────────────────────────

    private void saveNotification(Long appointmentId, Long patientId, String type) {
        try {
            NotificationLog n = new NotificationLog();
            n.setAppointmentId(appointmentId);
            n.setPatientId(patientId);
            n.setType(type);
            n.setSentAt(LocalDateTime.now());
            notificationLogRepository.save(n);
        } catch (Exception ex) {
            System.err.println("Notification log skipped: " + ex.getMessage());
        }
    }
}
