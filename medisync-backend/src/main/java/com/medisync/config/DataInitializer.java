package com.medisync.config;

import com.medisync.model.enums.Role;
import com.medisync.model.sql.User;
import com.medisync.repository.sql.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail("admin@medisync.com").isEmpty()) {
            User admin = User.builder()
                .firstname("Admin")
                .lastname("MediSync")
                .email("admin@medisync.com")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN)
                .build();
            userRepository.save(admin);
            System.out.println("✅ Admin créé : admin@medisync.com / admin123");
        }
    }
}