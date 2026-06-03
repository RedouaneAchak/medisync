package com.medisync.model.sql;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Data
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(mappedBy = "appointment", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("appointment")
    private Invoice invoice;
    private java.time.LocalDateTime dateTime;
    private Integer durationMinutes; // [cite: 1]
    private String appointmentType; // [cite: 1]

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne
    private Patient patient;

    @ManyToOne
    private Doctor doctor;

    @ManyToOne
    private Room room;

    private String status; // PENDING, CONFIRMED, CANCELLED[cite: 1]
}
