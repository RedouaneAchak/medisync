package com.medisync.repository.sql;

import com.medisync.model.sql.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
@Query("SELECT d FROM Doctor d JOIN d.user u WHERE " +
       "(:specialty IS NULL OR :specialty = '' OR :specialty = 'Tous' OR LOWER(d.specialty) = LOWER(:specialty)) AND " +
       "(:q IS NULL OR :q = '' OR " +
       "LOWER(u.firstname) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
       "LOWER(u.lastname) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
       "LOWER(d.specialty) LIKE LOWER(CONCAT('%', :q, '%')))")
List<Doctor> searchDoctors(@Param("specialty") String specialty, @Param("q") String q);}
