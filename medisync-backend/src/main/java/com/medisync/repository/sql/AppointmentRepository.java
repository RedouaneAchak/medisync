package com.medisync.repository.sql;

import com.medisync.model.sql.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    // For the patient's mobile app history
    List<Appointment> findByPatientId(Long patientId);
    
    // Crucial: Checks if a doctor is already busy during a specific time
    List<Appointment> findByDoctorIdAndDateTimeBetween(Long doctorId, LocalDateTime start, LocalDateTime end);
    
    // Crucial: Checks if a room is already taken
    List<Appointment> findByRoomIdAndDateTimeBetween(Long roomId, LocalDateTime start, LocalDateTime end);
}