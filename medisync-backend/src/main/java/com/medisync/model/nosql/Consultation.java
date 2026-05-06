package com.medisync.model.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Document(collection = "consultations")
@Data
public class Consultation {
    @Id
    private String id;
    private Long patientId; 
    private Long doctorId;
    private String observation; // Medical notes[cite: 1]
    private List<String> prescriptions; // Electronic prescriptions[cite: 1]
    private List<Map<String, Object>> files; // File metadata[cite: 1]
}