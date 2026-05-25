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

    // FIX : client ID lu depuis application.properties, plus hardcodé
    @Value("${google.client-id}")
    private String googleClientId;

    public AuthenticationService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository    = userRepository;
        this.patientRepository = patientRepository;
        this.jwtService        = jwtService;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder   = passwordEncoder;
    }

    // ── Login classique ───────────────────────────────────────────────────────

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
        return AuthenticationResponse.builder()
                .token(jwtService.generateToken(user))
                .build();
    }

    // ── Inscription patient (self-register) ───────────────────────────────────

    /**
     * FIX : RegisterRequest était déclaré mais jamais utilisé.
     * Cette méthode permet à un patient de créer son propre compte via l'API.
     */
    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email déjà utilisé : " + request.getEmail());
        }

        User user = User.builder()
                .firstname(request.getFirstname())
                .lastname(request.getLastname())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.PATIENT)
                .build();
        user = userRepository.save(user);

        // Créer automatiquement le profil Patient associé
        Patient patient = new Patient();
        patient.setUser(user);
        patient.setFirstName(request.getFirstname());
        patient.setLastName(request.getLastname());
        patientRepository.save(patient);

        return AuthenticationResponse.builder()
                .token(jwtService.generateToken(user))
                .build();
    }

    // ── Login Google OAuth2 ───────────────────────────────────────────────────

    public AuthenticationResponse googleLogin(GoogleLoginRequest request) {
        try {
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

            return AuthenticationResponse.builder()
                    .token(jwtService.generateToken(user))
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Authentification Google échouée : " + e.getMessage());
        }
    }
}
