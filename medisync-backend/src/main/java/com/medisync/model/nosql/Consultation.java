package com.medisync.model.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.time.LocalDateTime; // <-- Add this import
import java.util.List;
import java.util.Map;

@Document(collection = "consultations")
@Data
public class Consultation {
    @Id
    private String id;
    private Long patientId; 
    private Long doctorId;
    private Long appointmentId;
    private String observation;
    private List<String> prescriptions;
    private List<Map<String, Object>> files;
    
    // --- ADD THIS LINE ---
    private LocalDateTime createdAt; 
}
