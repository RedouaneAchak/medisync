package com.medisync.repository.sql;

import com.medisync.model.sql.ClinicProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicProfileRepository extends JpaRepository<ClinicProfile, Long> {
}
