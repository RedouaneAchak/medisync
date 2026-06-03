package com.medisync.controller;

import com.medisync.dto.DoctorFeedbackSummaryDto;
import com.medisync.dto.PatientFeedbackDto;
import com.medisync.model.sql.User;
import com.medisync.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @GetMapping("/doctor-summaries")
    public ResponseEntity<List<DoctorFeedbackSummaryDto>> getDoctorSummaries() {
        return ResponseEntity.ok(feedbackService.getDoctorSummaries());
    }

    @PostMapping("/patient/{patientId}")
    public ResponseEntity<PatientFeedbackDto> createFeedback(
            @PathVariable Long patientId,
            @AuthenticationPrincipal User currentUser,
            @RequestBody FeedbackRequest request
    ) {
        assertPatientAccess(currentUser, patientId);
        return ResponseEntity.ok(feedbackService.createFeedback(
                patientId,
                request.getDoctorId(),
                request.getAppointmentId(),
                request.getType(),
                request.getRating(),
                request.getTitle(),
                request.getMessage()
        ));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PatientFeedbackDto>> getPatientFeedback(
            @PathVariable Long patientId,
            @AuthenticationPrincipal User currentUser
    ) {
        assertPatientAccess(currentUser, patientId);
        return ResponseEntity.ok(feedbackService.getPatientFeedback(patientId));
    }

    @GetMapping("/admin")
    public ResponseEntity<List<PatientFeedbackDto>> getAllFeedback(@AuthenticationPrincipal User currentUser) {
        assertAdminAccess(currentUser);
        return ResponseEntity.ok(feedbackService.getAllFeedback());
    }

    @PatchMapping("/admin/{id}/status")
    public ResponseEntity<PatientFeedbackDto> updateStatus(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser,
            @RequestBody FeedbackStatusRequest request
    ) {
        assertAdminAccess(currentUser);
        return ResponseEntity.ok(feedbackService.updateStatus(id, request.getStatus()));
    }

    private void assertPatientAccess(User currentUser, Long patientId) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        if ("ADMIN".equals(currentUser.getRole().name())) {
            return;
        }
        if (!"PATIENT".equals(currentUser.getRole().name()) || !currentUser.getId().equals(patientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé à ce dossier patient.");
        }
    }

    private void assertAdminAccess(User currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        if (!"ADMIN".equals(currentUser.getRole().name())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès administrateur requis.");
        }
    }

    @lombok.Data
    public static class FeedbackRequest {
        private Long doctorId;
        private Long appointmentId;
        private String type;
        private Integer rating;
        private String title;
        private String message;
    }

    @lombok.Data
    public static class FeedbackStatusRequest {
        private String status;
    }
}
