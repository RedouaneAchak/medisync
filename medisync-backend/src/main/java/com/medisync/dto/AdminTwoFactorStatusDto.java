package com.medisync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminTwoFactorStatusDto {
    private boolean enabled;
    private boolean setupRequired;
    private String secret;
    private String provisioningUri;
    private LocalDateTime enabledAt;
}
