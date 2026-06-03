package com.medisync.model.nosql;

import lombok.Data;

@Data
public class PrescriptionItem {
    private String medicationName;
    private String dosage;
    private String frequency;
    private Integer durationDays;
    private String instructions;
}
