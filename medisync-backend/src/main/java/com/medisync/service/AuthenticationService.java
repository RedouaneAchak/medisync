package com.medisync.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.medisync.dto.AuthenticationRequest;
import com.medisync.dto.AuthenticationResponse;
import com.medisync.dto.GoogleLoginRequest;
import com.medisync.dto.RegisterRequest;
import com.medisync.model.enums.Role;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.User;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.UserRepository;
import com.medisync.security.JwtService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    @Value("${google.client-id}")
    private String googleClientId;

    public AuthenticationService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        String email = normalizeEmail(request.getEmail());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );
        User user = userRepository.findByEmail(email).orElseThrow();
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        String firstName = request.getFirstname().trim();
        String lastName = request.getLastname() == null ? "" : request.getLastname().trim();

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email deja utilise : " + email);
        }

        User user = User.builder()
                .firstname(firstName)
                .lastname(lastName)
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.PATIENT)
                .build();
        user = userRepository.save(user);

        Patient patient = new Patient();
        patient.setUser(user);
        patient.setFirstName(firstName);
        patient.setLastName(lastName);
        patientRepository.save(patient);

        return buildAuthResponse(user);
    }

    public AuthenticationResponse googleLogin(GoogleLoginRequest request) {
        try {
            if (googleClientId == null || googleClientId.isBlank() || "disabled".equalsIgnoreCase(googleClientId)) {
                throw new RuntimeException("Google Sign-In n'est pas configure sur le serveur.");
            }

            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier
                    .Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                throw new RuntimeException("Token Google invalide.");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
                throw new RuntimeException("L'email Google n'est pas verifie.");
            }

            return authenticateGoogleUser(
                    payload.getEmail(),
                    (String) payload.get("name"),
                    (String) payload.get("given_name"),
                    (String) payload.get("family_name")
            );
        } catch (Exception e) {
            throw new RuntimeException("Authentification Google echouee : " + e.getMessage());
        }
    }

    @Transactional
    public AuthenticationResponse authenticateGoogleUser(String email, String name, String givenName, String familyName) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) {
            throw new RuntimeException("Email Google manquant.");
        }

        User user = userRepository.findByEmail(normalizedEmail).orElseGet(() -> {
            String firstName = givenName != null && !givenName.isBlank()
                    ? givenName
                    : (name != null && !name.isBlank() ? name.split(" ")[0] : "Patient");
            String lastName = familyName != null && !familyName.isBlank()
                    ? familyName
                    : (name != null && name.contains(" ") ? name.substring(name.indexOf(" ") + 1) : "Google");

            User newUser = User.builder()
                    .firstname(firstName)
                    .lastname(lastName)
                    .email(normalizedEmail)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(Role.PATIENT)
                    .build();
            newUser = userRepository.save(newUser);

            Patient patient = new Patient();
            patient.setUser(newUser);
            patient.setFirstName(firstName);
            patient.setLastName(lastName);
            patientRepository.save(patient);

            return newUser;
        });

        if (user.getRole() == Role.PATIENT && patientRepository.findById(user.getId()).isEmpty()) {
            Patient patient = new Patient();
            patient.setUser(user);
            patient.setFirstName(user.getFirstname());
            patient.setLastName(user.getLastname());
            patientRepository.save(patient);
        }

        return buildAuthResponse(user);
    }

    private AuthenticationResponse buildAuthResponse(User user) {
        return AuthenticationResponse.builder()
                .token(jwtService.generateToken(user))
                .userId(user.getId())
                .firstname(user.getFirstname())
                .lastname(user.getLastname())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
