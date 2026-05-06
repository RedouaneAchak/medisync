package com.medisync.model.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.time.LocalDateTime;

@Document(collection = "audit_logs")
@Data
public class AuditLog {
    @Id
    private String id;
    private Long userId; //[cite: 1]
    private String action; //[cite: 1]
    private String targetEntity;
    private LocalDateTime timestamp;
    private String ipAddress;
}