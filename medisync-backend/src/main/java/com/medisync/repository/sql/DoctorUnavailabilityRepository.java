package com.medisync.repository.sql;

import com.medisync.model.sql.DoctorUnavailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface DoctorUnavailabilityRepository extends JpaRepository<DoctorUnavailability, Long> {

    List<DoctorUnavailability> findByDoctorIdOrderByStartDateTimeAsc(Long doctorId);

    @Query("""
        select u from DoctorUnavailability u
        where u.doctor.id = :doctorId
          and u.startDateTime < :end
          and u.endDateTime > :start
        order by u.startDateTime asc
        """)
    List<DoctorUnavailability> findOverlapping(
            @Param("doctorId") Long doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
