package com.medisync.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;
    private final RateLimitFilter rateLimitFilter;

    // Inject all three security components
    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthFilter, 
            AuthenticationProvider authenticationProvider,
            RateLimitFilter rateLimitFilter
    ) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.authenticationProvider = authenticationProvider;
        this.rateLimitFilter = rateLimitFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Cross-Origin Resource Sharing (CORS)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 2. Disable CSRF (Immune because of JWTs)
            .csrf(csrf -> csrf.disable())
            
            // 3. Prevent XSS & Clickjacking via HTTP Headers
            .headers(headers -> headers
                .xssProtection(xss -> xss.disable()) // Replaced by CSP below
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; script-src 'self'; frame-ancestors 'none';")
                )
            )
            
            // 4. Map the Access Control Rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll() 
                .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                .requestMatchers("/api/doctor/**").hasAnyAuthority("DOCTOR", "ADMIN")
                .requestMatchers("/api/secretary/**").hasAnyAuthority("SECRETARY", "ADMIN")
                .requestMatchers("/api/patient/**").hasAnyAuthority("PATIENT", "ADMIN")
                .anyRequest().authenticated() 
            )
            
            // 5. Enforce Stateless Sessions
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 6. Register the Authentication Provider
            .authenticationProvider(authenticationProvider)
            
            // 7. Define the exact order of the Security Filters
            // Drop DDoS/Brute Force attempts FIRST before doing heavy cryptography
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            // If they pass the rate limit, check their JWT token
            .addFilterAfter(jwtAuthFilter, RateLimitFilter.class);

        return http.build();
    }

    // Define the exact rules for which frontends can talk to this backend
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Strict mapping to your Angular and Ionic local servers
        configuration.setAllowedOrigins(List.of(
            "http://localhost:4200", 
            "http://localhost:8100"  
        ));
        
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}