package com.medisync.service;

import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Doctor;
import com.medisync.model.sql.DoctorUnavailability;
import com.medisync.model.sql.Patient;
import com.medisync.repository.nosql.ConsultationRepository;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.DoctorRepository;
import com.medisync.repository.sql.DoctorUnavailabilityRepository;
import com.medisync.repository.sql.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorUnavailabilityRepository doctorUnavailabilityRepository;
    private final PatientRepository patientRepository;
    private final ConsultationRepository consultationRepository;

    // ── Recherche de médecins ─────────────────────────────────────────────────

public List<Doctor> searchDoctors(String specialty, String q) {
    // This calls the custom @Query we wrote in DoctorRepository
    return doctorRepository.searchDoctors(specialty, q);
}

    public List<Doctor> getAll() {
        return doctorRepository.findAll();
    }

    public Doctor getById(Long id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Médecin introuvable : " + id));
    }

    private String normalizeSearchTerm(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("Tous")) {
            return null;
        }
        return value.trim();
    }

    // ── Planning ──────────────────────────────────────────────────────────────

    /**
     * Rendez-vous du jour pour un médecin.
     */
    public List<Appointment> getTodayAppointments(Long doctorId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay   = LocalDate.now().atTime(LocalTime.MAX);
        return appointmentRepository.findByDoctorIdAndDateTimeBetween(doctorId, startOfDay, endOfDay);
    }

    /**
     * Rendez-vous sur une plage donnée (planning semaine / mois).
     */
    public List<Appointment> getAppointmentsBetween(Long doctorId, LocalDateTime from, LocalDateTime to) {
        return appointmentRepository.findByDoctorIdAndDateTimeBetween(doctorId, from, to);
    }

    public List<DoctorUnavailability> getUnavailabilities(Long doctorId) {
        getById(doctorId);
        return doctorUnavailabilityRepository.findByDoctorIdOrderByStartDateTimeAsc(doctorId);
    }

    public DoctorUnavailability addUnavailability(Long doctorId, LocalDateTime start, LocalDateTime end, String reason, String type) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new RuntimeException("La période d'indisponibilité est invalide.");
        }

        Doctor doctor = getById(doctorId);
        List<DoctorUnavailability> overlaps = doctorUnavailabilityRepository.findOverlapping(doctorId, start, end);
        if (!overlaps.isEmpty()) {
            throw new RuntimeException("Une indisponibilité existe déjà sur cette période.");
        }

        DoctorUnavailability unavailability = DoctorUnavailability.builder()
                .doctor(doctor)
                .startDateTime(start)
                .endDateTime(end)
                .reason((reason == null || reason.isBlank()) ? "Indisponibilité" : reason.trim())
                .type((type == null || type.isBlank()) ? "BLOCKED" : type.trim().toUpperCase())
                .build();
        return doctorUnavailabilityRepository.save(unavailability);
    }

    public void deleteUnavailability(Long doctorId, Long unavailabilityId) {
        DoctorUnavailability unavailability = doctorUnavailabilityRepository.findById(unavailabilityId)
                .orElseThrow(() -> new RuntimeException("Indisponibilité introuvable : " + unavailabilityId));
        if (!unavailability.getDoctor().getId().equals(doctorId)) {
            throw new RuntimeException("Cette indisponibilité n'appartient pas à ce médecin.");
        }
        doctorUnavailabilityRepository.delete(unavailability);
    }

    /**
     * Créneaux libres d'un médecin pour une journée.
     * Logique : génère les créneaux de 08h à 18h par pas de durationMinutes,
     * puis retire ceux déjà pris.
     */
    public List<LocalDateTime> getAvailableSlots(Long doctorId, LocalDate date, int durationMinutes) {
        validateSlotDuration(durationMinutes);
        Doctor doctor = getById(doctorId);
        LocalTime availabilityStart = doctor.getAvailabilityStart() != null ? doctor.getAvailabilityStart() : LocalTime.of(8, 0);
        LocalTime availabilityEnd = doctor.getAvailabilityEnd() != null ? doctor.getAvailabilityEnd() : LocalTime.of(18, 0);
        if (!isWorkingDay(doctor, date.getDayOfWeek())) {
            return List.of();
        }

        LocalDateTime start = date.atTime(availabilityStart);
        LocalDateTime end   = date.atTime(availabilityEnd);

        List<Appointment> taken = appointmentRepository
                .findByDoctorIdAndDateTimeBetween(doctorId, start, end);
        List<DoctorUnavailability> blocked = doctorUnavailabilityRepository.findOverlapping(doctorId, start, end);

        List<LocalDateTime> allSlots = new java.util.ArrayList<>();
        LocalDateTime slot = start;
        while (slot.plusMinutes(durationMinutes).compareTo(end) <= 0) {
            allSlots.add(slot);
            slot = slot.plusMinutes(durationMinutes);
        }

        // Retire les créneaux déjà réservés
        return allSlots.stream()
                .filter(s -> taken.stream().noneMatch(a -> overlaps(s, durationMinutes, a.getDateTime(), a.getDurationMinutes())))
                .filter(s -> blocked.stream().noneMatch(u -> overlaps(s, durationMinutes, u.getStartDateTime(), u.getEndDateTime())))
                .toList();
    }

    // ── Gestion du profil médecin ─────────────────────────────────────────────

    public Doctor updateProfile(Long doctorId, Doctor updated) {
        Doctor existing = getById(doctorId);
        existing.setSpecialty(updated.getSpecialty());
        existing.setBio(updated.getBio());
        existing.setSpokenLanguages(updated.getSpokenLanguages());
        existing.setStandardConsultationRate(updated.getStandardConsultationRate());
        existing.setAvailabilityStart(updated.getAvailabilityStart());
        existing.setAvailabilityEnd(updated.getAvailabilityEnd());
        existing.setWorkingDays(updated.getWorkingDays());
        existing.setDefaultSlotMinutes(updated.getDefaultSlotMinutes());
        return doctorRepository.save(existing);
    }

    // ── Dossier patient (accès médecin) ───────────────────────────────────────

    public Patient getPatientRecord(Long patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient introuvable : " + patientId));
    }

    private boolean overlaps(LocalDateTime candidateStart, int candidateDuration, LocalDateTime existingStart, int existingDuration) {
        LocalDateTime candidateEnd = candidateStart.plusMinutes(candidateDuration);
        LocalDateTime existingEnd = existingStart.plusMinutes(existingDuration > 0 ? existingDuration : 30);
        return candidateStart.isBefore(existingEnd) && candidateEnd.isAfter(existingStart);
    }

    private boolean overlaps(LocalDateTime candidateStart, int candidateDuration, LocalDateTime existingStart, LocalDateTime existingEnd) {
        LocalDateTime candidateEnd = candidateStart.plusMinutes(candidateDuration);
        return candidateStart.isBefore(existingEnd) && candidateEnd.isAfter(existingStart);
    }

    private void validateSlotDuration(int durationMinutes) {
        if (!List.of(15, 30, 60).contains(durationMinutes)) {
            throw new RuntimeException("Durée invalide. Choisissez 15, 30 ou 60 minutes.");
        }
    }

    private boolean isWorkingDay(Doctor doctor, DayOfWeek dayOfWeek) {
        if (doctor.getWorkingDays() == null || doctor.getWorkingDays().isBlank()) {
            return true;
        }
        Set<String> activeDays = Arrays.stream(doctor.getWorkingDays().split(","))
                .map(String::trim)
                .map(String::toUpperCase)
                .collect(Collectors.toSet());
        return activeDays.contains(dayOfWeek.name());
    }
}
