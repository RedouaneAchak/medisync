package com.medisync.model.sql;
import jakarta.persistence.*;
import lombok.Data;
@Entity
@Table(name = "rooms")
@Data
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String roomNumber;
    private String equipmentType;
}