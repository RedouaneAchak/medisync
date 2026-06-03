package com.medisync.model.sql;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "clinic_profiles")
@Data
public class ClinicProfile {
    @Id
    private Long id;

    private String name;
    private String address;
    private String city;
    private String phone;
    private String email;
    private Double latitude;
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String openingHours;

    @Column(columnDefinition = "TEXT")
    private String specialtiesOffered;
}
