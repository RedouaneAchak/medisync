package com.medisync.controller;

import com.medisync.dto.AuthenticationRequest;
import com.medisync.dto.AuthenticationResponse;
import com.medisync.dto.GoogleLoginRequest;
import com.medisync.dto.RegisterRequest;
import com.medisync.service.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    private final AuthenticationService service;

    public AuthenticationController(AuthenticationService service) {
        this.service = service;
    }


    // Inscription d'un nouveau patient : crée son User + profil Patient et retourne un JWT directement
    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> authenticate(@Valid @RequestBody AuthenticationRequest request) {
        return ResponseEntity.ok(service.authenticate(request));
    }

    @PostMapping("/verify-admin-2fa")
    public ResponseEntity<AuthenticationResponse> verifyAdminTwoFactor(@RequestBody TwoFactorRequest request) {
        return ResponseEntity.ok(service.verifyAdminTwoFactor(request.getChallengeId(), request.getCode()));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthenticationResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(service.googleLogin(request));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthenticationResponse> currentUser(@AuthenticationPrincipal UserDetails currentUser) {
        return ResponseEntity.ok(service.currentUser(currentUser.getUsername()));
    }

    @lombok.Data
    public static class TwoFactorRequest {
        private String challengeId;
        private String code;
    }
}
