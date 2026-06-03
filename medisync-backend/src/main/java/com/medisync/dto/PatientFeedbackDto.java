package com.medisync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PatientFeedbackDto {
    private String id;
    private Long patientId;
    private Long doctorId;
    private String doctorName;
    private Long appointmentId;
    private String type;
    private Integer rating;
    private String title;
    private String message;
    private String status;
    private LocalDateTime createdAt;
}
