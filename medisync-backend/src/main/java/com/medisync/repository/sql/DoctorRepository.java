package com.medisync.repository.sql;

import com.medisync.model.sql.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    // Allows searching for "Cardiology" or "cardiology"
    List<Doctor> findBySpecialtyContainingIgnoreCase(String specialty);
}