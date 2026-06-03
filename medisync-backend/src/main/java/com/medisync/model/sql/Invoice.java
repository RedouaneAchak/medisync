package com.medisync.model.sql;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@Data
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Every appointment generates exactly one invoice
    @OneToOne
    @JoinColumn(name = "appointment_id", nullable = false)
    @JsonIgnoreProperties("invoice")
    private Appointment appointment;

    private Double totalAmount;
    
    private LocalDateTime issueDate;
    
    // This is the exact field the Repository uses for findByIsPaidFalse()
    private Boolean isPaid;

    private String paymentMethod; // e.g., CASH, CARD, INSURANCE
}
