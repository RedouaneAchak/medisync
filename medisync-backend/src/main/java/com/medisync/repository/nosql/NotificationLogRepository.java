package com.medisync.repository.nosql;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;
import com.medisync.model.nosql.NotificationLog;

public interface NotificationLogRepository extends MongoRepository<NotificationLog, String> {
    // Checks if a specific type of reminder (e.g., "24H_REMINDER") was already sent for a specific appointment
    boolean existsByAppointmentIdAndType(Long appointmentId, String type);
}