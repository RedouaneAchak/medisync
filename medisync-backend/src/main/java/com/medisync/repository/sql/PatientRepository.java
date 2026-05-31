package com.medisync.repository.sql;

import com.medisync.model.sql.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import java.util.List;
public interface PatientRepository extends JpaRepository<Patient, Long> {
    // Finds a patient using their SSN
    Optional<Patient> findBySocialSecurityNumber(String ssn);
    @Query("SELECT p FROM Patient p WHERE LOWER(p.user.firstname) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.user.lastname) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Patient> searchByName(@Param("query") String query);
}