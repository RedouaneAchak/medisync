package com.medisync.repository.nosql;

import com.medisync.model.nosql.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    // Allows the Admin to see a timeline of what a specific user did
    List<AuditLog> findByUserIdOrderByTimestampDesc(Long userId);
}