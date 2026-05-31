package com.medisync.model.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.time.LocalDateTime;

@Document(collection = "notification_logs")
@Data
public class NotificationLog {
    
    @Id
    private String id; // MongoDB uses String for its IDs
    
    // Links back to your PostgreSQL data
    private Long appointmentId;
    private Long patientId; 
    
    // What kind of reminder was this? (e.g., "24H_REMINDER" or "1H_REMINDER")
    private String type;
    
    // Exactly when the system sent the email/push notification
    private LocalDateTime sentAt;
}