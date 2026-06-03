package com.medisync.model.sql;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "care_sheets")
@Data
public class CareSheet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Appointment appointment;

    @ManyToOne(optional = false)
    private MedicalAct medicalAct;

    private Double amount;
    private String status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDateTime createdAt;
}
