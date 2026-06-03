package com.medisync.repository.sql;

import com.medisync.model.sql.AdminTwoFactorProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminTwoFactorProfileRepository extends JpaRepository<AdminTwoFactorProfile, Long> {
}
