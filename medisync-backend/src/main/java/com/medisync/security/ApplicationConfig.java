package com.medisync.security;

import com.medisync.model.sql.Patient;
import com.medisync.model.sql.User;
import com.medisync.repository.sql.PatientRepository;
import com.medisync.repository.sql.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;

@Configuration
public class ApplicationConfig {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    public ApplicationConfig(UserRepository userRepository, PatientRepository patientRepository) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> resolveLoginUser(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found in database"));
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private java.util.Optional<User> resolveLoginUser(String username) {
        if (username == null || username.isBlank()) {
            return java.util.Optional.empty();
        }

        String normalized = username.trim();
        String compactSsn = normalized.replaceAll("\\s+", "");

        return userRepository.findByEmail(normalized)
                .or(() -> patientRepository.findBySocialSecurityNumber(normalized).map(Patient::getUser))
                .or(() -> patientRepository.findBySocialSecurityNumber(compactSsn).map(Patient::getUser));
    }
}
