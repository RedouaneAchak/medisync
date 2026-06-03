package com.medisync.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleLoginRequest {
    @NotBlank(message = "Le token Google est obligatoire.")
    private String idToken; // The token Angular gets from Google
}
