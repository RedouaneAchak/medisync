package com.medisync.repository.sql;

import com.medisync.model.sql.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    @Query("""
            select d from Doctor d
            join d.user u
            where (:specialty is null or lower(d.specialty) like lower(concat('%', :specialty, '%')))
              and (:query is null
                or lower(d.specialty) like lower(concat('%', :query, '%'))
                or lower(u.firstname) like lower(concat('%', :query, '%'))
                or lower(u.lastname) like lower(concat('%', :query, '%'))
                or lower(concat(u.firstname, ' ', u.lastname)) like lower(concat('%', :query, '%')))
            """)
    List<Doctor> search(@Param("specialty") String specialty, @Param("query") String query);
}
