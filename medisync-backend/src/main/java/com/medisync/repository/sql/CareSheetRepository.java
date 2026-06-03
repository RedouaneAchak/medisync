package com.medisync.repository.sql;

import com.medisync.model.sql.CareSheet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CareSheetRepository extends JpaRepository<CareSheet, Long> {
    List<CareSheet> findAllByOrderByCreatedAtDesc();

    List<CareSheet> findByAppointmentIdOrderByCreatedAtDesc(Long appointmentId);

    List<CareSheet> findByStatusOrderByCreatedAtDesc(String status);
}
