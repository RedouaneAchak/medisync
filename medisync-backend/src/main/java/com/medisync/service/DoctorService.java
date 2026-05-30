package com.medisync.service;

import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Doctor;
import com.medisync.model.sql.Patient;
import com.medisync.repository.nosql.ConsultationRepository;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.DoctorRepository;
import com.medisync.repository.sql.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
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

    /**
     * Créneaux libres d'un médecin pour une journée.
     * Logique : génère les créneaux de 08h à 18h par pas de durationMinutes,
     * puis retire ceux déjà pris.
     */
    public List<LocalDateTime> getAvailableSlots(Long doctorId, LocalDate date, int durationMinutes) {
        LocalDateTime start = date.atTime(8, 0);
        LocalDateTime end   = date.atTime(18, 0);

        List<Appointment> taken = appointmentRepository
                .findByDoctorIdAndDateTimeBetween(doctorId, start, end);

        List<LocalDateTime> allSlots = new java.util.ArrayList<>();
        LocalDateTime slot = start;
        while (slot.plusMinutes(durationMinutes).compareTo(end) <= 0) {
            allSlots.add(slot);
            slot = slot.plusMinutes(durationMinutes);
        }

        // Retire les créneaux déjà réservés
        return allSlots.stream()
                .filter(s -> taken.stream().noneMatch(a -> a.getDateTime().equals(s)))
                .toList();
    }

    // ── Gestion du profil médecin ─────────────────────────────────────────────

    public Doctor updateProfile(Long doctorId, Doctor updated) {
        Doctor existing = getById(doctorId);
        existing.setSpecialty(updated.getSpecialty());
        existing.setBio(updated.getBio());
        existing.setSpokenLanguages(updated.getSpokenLanguages());
        existing.setStandardConsultationRate(updated.getStandardConsultationRate());
        return doctorRepository.save(existing);
    }

    // ── Dossier patient (accès médecin) ───────────────────────────────────────

    public Patient getPatientRecord(Long patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient introuvable : " + patientId));
    }
}
