package com.medisync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DoctorFeedbackSummaryDto {
    private Long doctorId;
    private double averageRating;
    private long reviewCount;
    private long complaintCount;
}
