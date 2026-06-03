package com.medisync.model.sql;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "medical_acts")
@Data
public class MedicalAct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String label;

    private String category;
    private String sector;
    private Integer durationMinutes;
    private Double baseTariff;

    @Column(columnDefinition = "TEXT")
    private String description;
}
