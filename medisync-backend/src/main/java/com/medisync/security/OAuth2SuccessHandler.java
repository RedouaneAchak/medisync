package com.medisync.security;

import com.medisync.dto.AuthenticationResponse;
import com.medisync.model.enums.Role;
import com.medisync.model.sql.Patient;
import com.medisync.model.sql.User;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Locale;
import java.util.UUID;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public OAuth2SuccessHandler(
            UserRepository userRepository,
            PatientRepository patientRepository,
            JwtService jwtService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        AuthenticationResponse authResponse = authenticateGoogleUser(
                oAuth2User.getAttribute("email"),
                oAuth2User.getAttribute("name"),
                oAuth2User.getAttribute("given_name"),
                oAuth2User.getAttribute("family_name")
        );

        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:4200/login")
                .queryParam("token", authResponse.getToken())
                .queryParam("role", authResponse.getRole())
                .queryParam("userId", authResponse.getUserId())
                .build()
                .toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private AuthenticationResponse authenticateGoogleUser(String email, String name, String givenName, String familyName) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) {
            throw new IllegalArgumentException("Email Google manquant.");
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
