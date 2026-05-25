package com.medisync.controller;

import com.medisync.dto.AuthenticationRequest;
import com.medisync.dto.AuthenticationResponse;
import com.medisync.dto.GoogleLoginRequest;
import com.medisync.dto.RegisterRequest;
import com.medisync.service.AuthenticationService;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<AuthenticationResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request) {
        return ResponseEntity.ok(service.authenticate(request));
    }

//    @PostMapping("/google")
//    public ResponseEntity<AuthenticationResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
//        return ResponseEntity.ok(service.googleLogin(request));
//    } decommenté après l'ajout de Client ID Google dans application.properties
}
