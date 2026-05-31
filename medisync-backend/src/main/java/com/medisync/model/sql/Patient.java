package com.medisync.model.sql;

import com.medisync.model.enums.PatientCategory;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "patients")
@Data
public class Patient {
    @Id
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    private User user;

    @Column(unique = true)
    private String socialSecurityNumber; //

    private String firstName;
    private String lastName;
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    private PatientCategory category;

    private String companyName; // For "conventions entreprises"

    @ManyToOne
    @JoinColumn(name = "guardian_id")
    private Patient guardian; // For "rendez-vous pour un tiers"
}