package com.medisync.security;

// --- THE IMPORTS ---
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthFilter,
            AuthenticationProvider authenticationProvider,
             OAuth2SuccessHandler oAuth2SuccessHandler,
            RateLimitFilter rateLimitFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.authenticationProvider = authenticationProvider;
        this.rateLimitFilter = rateLimitFilter;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .headers(headers -> headers
                        .xssProtection(xss -> xss.disable())
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives("default-src 'self'; script-src 'self'; frame-ancestors 'none';")))
                .authorizeHttpRequests(auth -> auth
                        // 1. OAUTH2 DOORS OPENED HERE
                        .requestMatchers("/oauth2/**", "/login/**").permitAll()

                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        // Public doctor browsing — no token required
                        .requestMatchers(HttpMethod.GET, "/api/doctor").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/doctor/search").permitAll()

                        .requestMatchers("/api/admin/**").hasAnyAuthority(
                                "ADMIN", "ROLE_ADMIN")
                        .requestMatchers("/api/secretary/**").hasAnyAuthority(
                                "SECRETARY", "ADMIN", "ROLE_SECRETARY", "ROLE_ADMIN")
                        .requestMatchers("/api/patient/**").hasAnyAuthority(
                                "PATIENT", "ADMIN", "ROLE_PATIENT", "ROLE_ADMIN")
                        .anyRequest().authenticated())
                // 2. OAUTH2 LOGIN & REDIRECT ADDED HERE
                .oauth2Login(oauth2 -> oauth2
                        // Do NOT use defaultSuccessUrl here anymore!
                        .successHandler(oAuth2SuccessHandler))
                // Note: Since you use OAuth2 (which relies on sessions during the redirect
                // flow),
                // we remove the strict STATELESS policy so Google Auth doesn't crash
                // mid-flight.
                // (If you kept it strictly stateless, you would need a custom Cookie request
                // repository).
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(jwtAuthFilter, RateLimitFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
                "http://localhost:4200",
                "http://localhost:8100"));
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}