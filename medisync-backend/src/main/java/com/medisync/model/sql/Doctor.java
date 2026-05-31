package com.medisync.model.sql;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "doctors")
@Data
public class Doctor {
    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    private User user;

    private String specialty; 
    private String bio;
    private String spokenLanguages; 
    private Double standardConsultationRate; // For Secteur 1, 2, 3 pricing
}