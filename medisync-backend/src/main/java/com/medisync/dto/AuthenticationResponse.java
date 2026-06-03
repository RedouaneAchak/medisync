package com.medisync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationResponse {
    private String token;
    private Long userId;
    private String firstname;
    private String lastname;
    private String email;
    private String role;
    private Set<String> permissions;
    private Boolean twoFactorEnabled;
    private Boolean requiresTwoFactorSetup;
}
