package com.medisync.repository.sql;

import com.medisync.model.sql.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    // The Secretary dashboard can instantly pull up all unpaid bills
    List<Invoice> findByIsPaidFalse();
}