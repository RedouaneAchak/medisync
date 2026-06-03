package com.medisync.controller;

import com.medisync.model.sql.MedicalAct;
import com.medisync.service.MedicalActService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical-acts")
@RequiredArgsConstructor
public class MedicalActController {

    private final MedicalActService medicalActService;

    @GetMapping
    public ResponseEntity<List<MedicalAct>> getAll(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(medicalActService.getAll(q));
    }
}
