package com.medisync.repository.nosql;

import com.medisync.model.nosql.Consultation;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ConsultationRepository extends MongoRepository<Consultation, String> {
    // Grabs the entire medical history for a specific patient
    List<Consultation> findByPatientId(Long patientId);
    void deleteByPatientId(Long patientId);
}
