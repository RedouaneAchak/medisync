package com.medisync.service;

import com.medisync.dto.AuthenticationRequest;
import com.medisync.dto.AuthenticationResponse;
import com.medisync.dto.RegisterRequest;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.User;
import com.medisync.model.enums.Role;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.UserRepository;
import com.medisync.security.JwtService;
import com.medisync.util.PasswordPolicy;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.medisync.dto.GoogleLoginRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.util.Collections;
import java.util.UUID;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final AdminTwoFactorService adminTwoFactorService;

    // FIX : client ID lu depuis application.properties, plus hardcodé
    @Value("${google.client-id}")
    private String googleClientId;

    public AuthenticationService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder,
            AdminTwoFactorService adminTwoFactorService
    ) {
        this.userRepository    = userRepository;
        this.patientRepository = patientRepository;
        this.jwtService        = jwtService;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder   = passwordEncoder;
        this.adminTwoFactorService = adminTwoFactorService;
    }

    // ── Login classique ───────────────────────────────────────────────────────

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        String identifier = loginIdentifier(request);
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        identifier,
                        request.getPassword()
                )
        );
        User user = resolveUserByIdentifier(identifier);
        adminTwoFactorService.validateOtp(user, request.getOtpCode());
        return buildAuthResponse(user);
    }

    // ── Inscription patient (self-register) ───────────────────────────────────

    /**
     * FIX : RegisterRequest était déclaré mais jamais utilisé.
     * Cette méthode permet à un patient de créer son propre compte via l'API.
     */
    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        String email = resolveRegistrationEmail(request);
        String normalizedSsn = normalizeSsn(request.getSocialSecurityNumber());

        PasswordPolicy.validateOrThrow(request.getPassword());

        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email déjà utilisé : " + email);
        }
        if (normalizedSsn != null && patientRepository.findBySocialSecurityNumber(normalizedSsn).isPresent()) {
            throw new RuntimeException("Numéro de sécurité sociale déjà utilisé : " + normalizedSsn);
        }

        User user = User.builder()
                .firstname(request.getFirstname())
                .lastname(request.getLastname())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.PATIENT)
                .build();
        user = userRepository.save(user);

        // Créer automatiquement le profil Patient associé
        Patient patient = new Patient();
        patient.setUser(user);
        patient.setFirstName(request.getFirstname());
        patient.setLastName(request.getLastname());
        patient.setPhoneNumber(request.getPhone());
        patient.setSocialSecurityNumber(normalizedSsn);
        patientRepository.save(patient);

        return buildAuthResponse(user);
    }

    // ── Login Google OAuth2 ───────────────────────────────────────────────────

    public AuthenticationResponse googleLogin(GoogleLoginRequest request) {
        try {
            if (googleClientId == null || googleClientId.isBlank() || "disabled".equalsIgnoreCase(googleClientId)) {
                throw new RuntimeException("Google Sign-In n'est pas configuré sur le serveur.");
            }

            // FIX : googleClientId injecté depuis application.properties
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier
                    .Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                throw new RuntimeException("Token Google invalide.");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name  = (String) payload.get("name");

            User user = userRepository.findByEmail(email).orElseGet(() -> {
                String firstName = name != null ? name.split(" ")[0] : "";
                String lastName  = (name != null && name.contains(" "))
                        ? name.substring(name.indexOf(" ") + 1) : "";

                User newUser = User.builder()
                        .firstname(firstName)
                        .lastname(lastName)
                        .email(email)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .role(Role.PATIENT)
                        .build();
                newUser = userRepository.save(newUser);

                // Créer aussi le profil Patient
                Patient p = new Patient();
                p.setUser(newUser);
                p.setFirstName(firstName);
                p.setLastName(lastName);
                patientRepository.save(p);

                return newUser;
            });

            if (user.getRole() == Role.ADMIN && adminTwoFactorService.isTwoFactorEnabled(user)) {
                throw new RuntimeException("Les comptes administrateurs avec 2FA active doivent utiliser la connexion classique avec code OTP.");
            }

            return buildAuthResponse(user);

        } catch (Exception e) {
            throw new RuntimeException("Authentification Google échouée : " + e.getMessage());
        }
    }

    private AuthenticationResponse buildAuthResponse(User user) {
        return AuthenticationResponse.builder()
                .token(jwtService.generateToken(user))
                .userId(user.getId())
                .firstname(user.getFirstname())
                .lastname(user.getLastname())
                .email(user.getEmail())
                .role(user.getRole().name())
                .permissions(user.getEffectivePermissions())
                .twoFactorEnabled(adminTwoFactorService.isTwoFactorEnabled(user))
                .requiresTwoFactorSetup(adminTwoFactorService.isSetupRequired(user))
                .build();
    }

    private String loginIdentifier(AuthenticationRequest request) {
        if (request.getIdentifier() != null && !request.getIdentifier().isBlank()) {
            return request.getIdentifier().trim();
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            return request.getEmail().trim();
        }
        throw new RuntimeException("Veuillez renseigner votre email ou votre numéro de sécurité sociale.");
    }

    private User resolveUserByIdentifier(String identifier) {
        String normalized = identifier.trim();
        String compactSsn = normalizeSsn(normalized);
        return userRepository.findByEmail(normalized)
                .or(() -> patientRepository.findBySocialSecurityNumber(normalized).map(Patient::getUser))
                .or(() -> compactSsn == null ? java.util.Optional.empty() : patientRepository.findBySocialSecurityNumber(compactSsn).map(Patient::getUser))
                .orElseThrow();
    }

    private String resolveRegistrationEmail(RegisterRequest request) {
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            return request.getEmail().trim().toLowerCase();
        }

        String normalizedSsn = normalizeSsn(request.getSocialSecurityNumber());
        if (normalizedSsn == null) {
            throw new RuntimeException("Veuillez renseigner un email ou un numéro de sécurité sociale.");
        }

        return "patient-" + normalizedSsn + "@medisync.local";
    }

    private String normalizeSsn(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.replaceAll("\\s+", "").trim();
    }
}
