package com.medisync.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MedicationSuggestionDto {
    private String name;
    private String form;
    private String commonDosage;
    private String frequencyHint;
}
