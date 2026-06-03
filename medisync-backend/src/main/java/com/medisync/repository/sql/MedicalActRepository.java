package com.medisync.repository.sql;

import com.medisync.model.sql.MedicalAct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MedicalActRepository extends JpaRepository<MedicalAct, Long> {
    Optional<MedicalAct> findByCodeIgnoreCase(String code);

    @Query("""
        select act from MedicalAct act
        where (:q is null
            or lower(act.code) like lower(concat('%', :q, '%'))
            or lower(act.label) like lower(concat('%', :q, '%'))
            or lower(coalesce(act.category, '')) like lower(concat('%', :q, '%')))
        order by act.label asc
        """)
    List<MedicalAct> search(String q);
}
