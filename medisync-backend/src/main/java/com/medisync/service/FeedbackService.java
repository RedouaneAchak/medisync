package com.medisync.service;

import com.medisync.dto.DoctorFeedbackSummaryDto;
import com.medisync.dto.PatientFeedbackDto;
import com.medisync.model.nosql.PatientFeedback;
import com.medisync.model.sql.Appointment;
import com.medisync.model.sql.Doctor;
import com.medisync.model.sql.Patient;
import com.medisync.repository.nosql.PatientFeedbackRepository;
import com.medisync.repository.sql.AppointmentRepository;
import com.medisync.repository.sql.DoctorRepository;
import com.medisync.repository.sql.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final PatientFeedbackRepository patientFeedbackRepository;
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public PatientFeedbackDto createFeedback(
            Long patientId,
            Long doctorId,
            Long appointmentId,
            String type,
            Integer rating,
            String title,
            String message
    ) {
        patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient introuvable : " + patientId));

        String normalizedType = normalizeType(type);
        if ((title == null || title.isBlank()) && (message == null || message.isBlank())) {
            throw new RuntimeException("Veuillez renseigner un titre ou un message pour l'avis.");
        }

        Long resolvedDoctorId = doctorId;
        Appointment appointment = null;
        if (appointmentId != null) {
            appointment = appointmentRepository.findById(appointmentId)
                    .orElseThrow(() -> new RuntimeException("Rendez-vous introuvable : " + appointmentId));
            if (appointment.getPatient() == null || !patientId.equals(appointment.getPatient().getId())) {
                throw new RuntimeException("Ce rendez-vous n'appartient pas au patient connecté.");
            }
            if (resolvedDoctorId == null && appointment.getDoctor() != null) {
                resolvedDoctorId = appointment.getDoctor().getId();
            }
        }

        if (resolvedDoctorId != null) {
            Long finalDoctorId = resolvedDoctorId;
            doctorRepository.findById(finalDoctorId)
                    .orElseThrow(() -> new RuntimeException("Médecin introuvable : " + finalDoctorId));
        }

        if ("REVIEW".equals(normalizedType)) {
            if (rating == null || rating < 1 || rating > 5) {
                throw new RuntimeException("La note d'un avis doit être comprise entre 1 et 5.");
            }
        } else {
            rating = null;
        }

        PatientFeedback feedback = new PatientFeedback();
        feedback.setPatientId(patientId);
        feedback.setDoctorId(resolvedDoctorId);
        feedback.setAppointmentId(appointment != null ? appointment.getId() : appointmentId);
        feedback.setType(normalizedType);
        feedback.setRating(rating);
        feedback.setTitle((title == null || title.isBlank())
                ? ("REVIEW".equals(normalizedType) ? "Avis patient" : "Réclamation patient")
                : title.trim());
        feedback.setMessage(message != null ? message.trim() : "");
        feedback.setStatus("OPEN");
        feedback.setCreatedAt(LocalDateTime.now());

        return toDto(patientFeedbackRepository.save(feedback));
    }

    public List<PatientFeedbackDto> getPatientFeedback(Long patientId) {
        return patientFeedbackRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toDto)
                .toList();
    }

    public List<PatientFeedbackDto> getAllFeedback() {
        return patientFeedbackRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    public PatientFeedbackDto updateStatus(String id, String status) {
        PatientFeedback feedback = patientFeedbackRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Feedback introuvable : " + id));
        feedback.setStatus(normalizeStatus(status));
        return toDto(patientFeedbackRepository.save(feedback));
    }

    public List<DoctorFeedbackSummaryDto> getDoctorSummaries() {
        List<PatientFeedback> allFeedback = patientFeedbackRepository.findAll();

        Map<Long, List<PatientFeedback>> byDoctor = allFeedback.stream()
                .filter(item -> item.getDoctorId() != null)
                .collect(Collectors.groupingBy(PatientFeedback::getDoctorId));

        List<DoctorFeedbackSummaryDto> summaries = new ArrayList<>();
        byDoctor.forEach((doctorId, items) -> {
            List<PatientFeedback> reviews = items.stream()
                    .filter(item -> "REVIEW".equals(item.getType()) && item.getRating() != null)
                    .toList();

            double averageRating = reviews.isEmpty()
                    ? 0.0
                    : reviews.stream().mapToInt(PatientFeedback::getRating).average().orElse(0.0);

            long complaintCount = items.stream()
                    .filter(item -> "COMPLAINT".equals(item.getType()))
                    .count();

            summaries.add(DoctorFeedbackSummaryDto.builder()
                    .doctorId(doctorId)
                    .averageRating(averageRating)
                    .reviewCount(reviews.size())
                    .complaintCount(complaintCount)
                    .build());
        });

        return summaries.stream()
                .sorted(Comparator.comparing(DoctorFeedbackSummaryDto::getAverageRating).reversed())
                .toList();
    }

    private PatientFeedbackDto toDto(PatientFeedback feedback) {
        return PatientFeedbackDto.builder()
                .id(feedback.getId())
                .patientId(feedback.getPatientId())
                .doctorId(feedback.getDoctorId())
                .doctorName(resolveDoctorName(feedback.getDoctorId()))
                .appointmentId(feedback.getAppointmentId())
                .type(feedback.getType())
                .rating(feedback.getRating())
                .title(feedback.getTitle())
                .message(feedback.getMessage())
                .status(feedback.getStatus())
                .createdAt(feedback.getCreatedAt())
                .build();
    }

    private String resolveDoctorName(Long doctorId) {
        if (doctorId == null) {
            return "Clinique MediSync";
        }
        Optional<Doctor> doctor = doctorRepository.findById(doctorId);
        return doctor
                .map(value -> "Dr. " + value.getUser().getFirstname() + " " + value.getUser().getLastname())
                .orElse("Médecin #" + doctorId);
    }

    private String normalizeType(String type) {
        String normalized = type == null ? "REVIEW" : type.trim().toUpperCase();
        if (!List.of("REVIEW", "COMPLAINT").contains(normalized)) {
            throw new RuntimeException("Type de feedback invalide.");
        }
        return normalized;
    }

    private String normalizeStatus(String status) {
        String normalized = status == null ? "OPEN" : status.trim().toUpperCase();
        if (!List.of("OPEN", "IN_REVIEW", "RESOLVED").contains(normalized)) {
            throw new RuntimeException("Statut de feedback invalide.");
        }
        return normalized;
    }
}
