package com.medisync.repository.sql;

import com.medisync.model.sql.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Spring Boot turns this into: SELECT * FROM users WHERE email = ?
    Optional<User> findByEmail(String email);
}