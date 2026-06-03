package com.medisync.repository.nosql;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.medisync.model.nosql.NotificationLog;
import java.util.List;

public interface NotificationLogRepository extends MongoRepository<NotificationLog, String> {
    // Checks if a specific type of reminder (e.g., "24H_REMINDER") was already sent for a specific appointment
    boolean existsByAppointmentIdAndType(Long appointmentId, String type);

    List<NotificationLog> findByPatientIdOrderBySentAtDesc(Long patientId);
}
