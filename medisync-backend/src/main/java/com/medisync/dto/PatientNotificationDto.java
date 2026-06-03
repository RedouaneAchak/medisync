package com.medisync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientNotificationDto {
    private String title;
    private String detail;
    private String tone;
    private String category;
    private LocalDateTime createdAt;
}
