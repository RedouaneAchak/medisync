package com.medisync.repository.sql;

import com.medisync.model.sql.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    // Finds a patient using their SSN
    Optional<Patient> findBySocialSecurityNumber(String ssn);
}