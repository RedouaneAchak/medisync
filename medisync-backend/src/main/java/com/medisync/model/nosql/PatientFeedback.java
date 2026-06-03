package com.medisync.model.nosql;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "patient_feedback")
@Data
public class PatientFeedback {
    @Id
    private String id;
    private Long patientId;
    private Long doctorId;
    private Long appointmentId;
    private String type;
    private Integer rating;
    private String title;
    private String message;
    private String status;
    private LocalDateTime createdAt;
}
