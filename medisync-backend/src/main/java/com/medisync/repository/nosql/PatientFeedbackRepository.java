package com.medisync.repository.nosql;

import com.medisync.model.nosql.PatientFeedback;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PatientFeedbackRepository extends MongoRepository<PatientFeedback, String> {
    List<PatientFeedback> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<PatientFeedback> findAllByOrderByCreatedAtDesc();
    List<PatientFeedback> findByDoctorIdAndType(Long doctorId, String type);
}
