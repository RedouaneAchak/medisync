package com.medisync.controller;

import com.medisync.model.sql.ClinicProfile;
import com.medisync.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clinic-profile")
@RequiredArgsConstructor
public class ClinicController {

    private final AdminService adminService;

    @GetMapping
    public ResponseEntity<ClinicProfile> getClinicProfile() {
        return ResponseEntity.ok(adminService.getClinicProfile());
    }
}
