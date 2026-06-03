package com.medisync.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "Le nom est obligatoire.")
    @Size(max = 80, message = "Le nom ne doit pas dépasser 80 caractères.")
    private String firstname;

    @Size(max = 80, message = "Le prénom ne doit pas dépasser 80 caractères.")
    private String lastname;

    @NotBlank(message = "L'email est obligatoire.")
    @Email(message = "L'adresse email est invalide.")
    @Size(max = 160, message = "L'email ne doit pas dépasser 160 caractères.")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire.")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,72}$",
            message = "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial."
    )
    private String password;

    @Size(max = 30, message = "Le téléphone ne doit pas dépasser 30 caractères.")
    private String phone;
}
