package com.medisync.controller;

import com.medisync.dto.AdminTwoFactorStatusDto;
import com.medisync.model.enums.Permission;
import com.medisync.model.enums.Role;
import com.medisync.model.nosql.AuditLog;
import com.medisync.model.sql.ClinicProfile;
import com.medisync.model.sql.Doctor;
import com.medisync.model.sql.MedicalAct;
import com.medisync.model.sql.Room;
import com.medisync.model.sql.User;
import com.medisync.service.AdminService;
import com.medisync.service.AdminTwoFactorService;
import com.medisync.service.MedicalActService;
import com.medisync.util.RolePermissionCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Espace administrateur — accès strictement réservé au rôle ADMIN.
 * Routes protégées par SecurityConfig : /api/admin/**
 *
 * NOTE : La 2FA TOTP est requise par le CDC pour accéder à ces routes.
 * Le filtre 2FA est à implémenter dans TwoFactorAuthFilter (voir TODO ci-dessous).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final AdminTwoFactorService adminTwoFactorService;
    private final MedicalActService medicalActService;

    // ── Gestion des utilisateurs ──────────────────────────────────────────────

    /**
     * GET /api/admin/users
     * Liste tous les utilisateurs du système (tous rôles confondus).
     */
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    /**
     * POST /api/admin/users
     * Crée un compte utilisateur de n'importe quel rôle.
     * Si rôle = DOCTOR, crée aussi le profil Doctor associé automatiquement.
     *
     * Body JSON :
     * {
     *   "firstname": "Marie",
     *   "lastname": "Laurent",
     *   "email": "m.laurent@clinique.fr",
     *   "password": "MotDeP@sse1",
     *   "role": "DOCTOR"
     * }
     */
    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody UserCreateRequest request) {
        return ResponseEntity.ok(
                adminService.createUser(
                        request.getFirstname(),
                        request.getLastname(),
                        request.getEmail(),
                        request.getPassword(),
                        request.getRole(),
                        request.getExtraPermissions()
                )
        );
    }

    @PutMapping("/users/{id}/permissions")
    public ResponseEntity<User> updateUserPermissions(
            @PathVariable Long id,
            @RequestBody UserPermissionsUpdateRequest request) {
        return ResponseEntity.ok(adminService.updateUserPermissions(id, request.getExtraPermissions()));
    }

    /**
     * DELETE /api/admin/users/{id}
     * Supprime un compte utilisateur. Action tracée dans AuditLog.
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // ── Gestion des médecins ──────────────────────────────────────────────────

    /**
     * GET /api/admin/doctors
     * Liste tous les médecins avec leurs profils complets.
     */
    @GetMapping("/doctors")
    public ResponseEntity<List<Doctor>> getAllDoctors() {
        return ResponseEntity.ok(adminService.getAllDoctors());
    }

    /**
     * PUT /api/admin/doctors/{id}
     * Modifie le profil d'un médecin (spécialité, bio, langues, tarif).
     */
    @PutMapping("/doctors/{id}")
    public ResponseEntity<Doctor> updateDoctor(
            @PathVariable Long id,
            @RequestBody DoctorUpdateRequest request) {
        return ResponseEntity.ok(
                adminService.updateDoctor(
                        id,
                        request.getSpecialty(),
                        request.getBio(),
                        request.getSpokenLanguages(),
                        request.getRate(),
                        request.getAvailabilityStart(),
                        request.getAvailabilityEnd(),
                        request.getWorkingDays(),
                        request.getDefaultSlotMinutes()
                )
        );
    }

    // ── Gestion des salles ────────────────────────────────────────────────────

    /**
     * GET /api/admin/rooms
     * Liste toutes les salles de consultation.
     */
    @GetMapping("/rooms")
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(adminService.getAllRooms());
    }

    @GetMapping("/clinic-profile")
    public ResponseEntity<ClinicProfile> getClinicProfile() {
        return ResponseEntity.ok(adminService.getClinicProfile());
    }

    @PutMapping("/clinic-profile")
    public ResponseEntity<ClinicProfile> updateClinicProfile(@RequestBody ClinicProfile profile) {
        return ResponseEntity.ok(adminService.updateClinicProfile(profile));
    }

    /**
     * POST /api/admin/rooms
     * Crée une nouvelle salle de consultation.
     *
     * Body JSON : { "roomNumber": "B12", "equipmentType": "Échographe" }
     */
    @PostMapping("/rooms")
    public ResponseEntity<Room> createRoom(@RequestBody RoomCreateRequest request) {
        return ResponseEntity.ok(
                adminService.createRoom(request.getRoomNumber(), request.getEquipmentType())
        );
    }

    /**
     * DELETE /api/admin/rooms/{id}
     * Supprime une salle.
     */
    @DeleteMapping("/rooms/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        adminService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/medical-acts")
    public ResponseEntity<List<MedicalAct>> getAllMedicalActs(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(medicalActService.getAll(q));
    }

    @PostMapping("/medical-acts")
    public ResponseEntity<MedicalAct> createMedicalAct(@RequestBody MedicalActRequest request) {
        MedicalAct act = new MedicalAct();
        act.setCode(request.getCode());
        act.setLabel(request.getLabel());
        act.setCategory(request.getCategory());
        act.setSector(request.getSector());
        act.setDurationMinutes(request.getDurationMinutes());
        act.setBaseTariff(request.getBaseTariff());
        act.setDescription(request.getDescription());
        return ResponseEntity.ok(medicalActService.create(act));
    }

    @PutMapping("/medical-acts/{id}")
    public ResponseEntity<MedicalAct> updateMedicalAct(@PathVariable Long id, @RequestBody MedicalActRequest request) {
        MedicalAct act = new MedicalAct();
        act.setCode(request.getCode());
        act.setLabel(request.getLabel());
        act.setCategory(request.getCategory());
        act.setSector(request.getSector());
        act.setDurationMinutes(request.getDurationMinutes());
        act.setBaseTariff(request.getBaseTariff());
        act.setDescription(request.getDescription());
        return ResponseEntity.ok(medicalActService.update(id, act));
    }

    @DeleteMapping("/medical-acts/{id}")
    public ResponseEntity<Void> deleteMedicalAct(@PathVariable Long id) {
        medicalActService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Tableau de bord / Statistiques ───────────────────────────────────────

    /**
     * GET /api/admin/dashboard?from=2025-06-01T00:00&to=2025-06-30T23:59
     * Retourne tous les KPIs en un seul appel :
     * - Nombre total de RDV, confirmés, annulés
     * - Taux de no-show
     * - Revenus encaissés sur la période
     * - Nombre de factures impayées
     * - RDV par médecin
     * - Occupation des salles
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(adminService.getDashboard(from, to));
    }

    @GetMapping("/permissions/catalog")
    public ResponseEntity<Map<String, Object>> getPermissionCatalog() {
        return ResponseEntity.ok(Map.of(
                "availablePermissions", RolePermissionCatalog.availablePermissionNames(),
                "roleDefaults", RolePermissionCatalog.roleDefaults()
        ));
    }

    // ── Journal d'audit ───────────────────────────────────────────────────────

    /**
     * GET /api/admin/audit-logs
     * Journal complet de toutes les actions sensibles enregistrées en MongoDB.
     * Utilisé pour la conformité RGPD et la supervision de l'établissement.
     *
     * TODO : Ajouter des filtres (userId, action, dateRange) via @RequestParam optionnels.
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(adminService.getAuditLogs());
    }

    @GetMapping("/two-factor")
    public ResponseEntity<AdminTwoFactorStatusDto> getTwoFactorStatus(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(adminTwoFactorService.getStatus(currentUser));
    }

    @PostMapping("/two-factor/enable")
    public ResponseEntity<AdminTwoFactorStatusDto> enableTwoFactor(
            @AuthenticationPrincipal User currentUser,
            @RequestBody TwoFactorEnableRequest request) {
        return ResponseEntity.ok(adminTwoFactorService.enable(currentUser, request.getOtpCode()));
    }

    // ── DTOs internes ─────────────────────────────────────────────────────────

    @lombok.Data
    public static class UserCreateRequest {
        private String firstname;
        private String lastname;
        private String email;
        private String password;
        private Role role;
        private java.util.Set<Permission> extraPermissions;
    }

    @lombok.Data
    public static class UserPermissionsUpdateRequest {
        private java.util.Set<Permission> extraPermissions;
    }

    @lombok.Data
    public static class DoctorUpdateRequest {
        private String specialty;
        private String bio;
        private String spokenLanguages;
        private Double rate;
        private java.time.LocalTime availabilityStart;
        private java.time.LocalTime availabilityEnd;
        private String workingDays;
        private Integer defaultSlotMinutes;
    }

    @lombok.Data
    public static class RoomCreateRequest {
        private String roomNumber;
        private String equipmentType;
    }

    @lombok.Data
    public static class MedicalActRequest {
        private String code;
        private String label;
        private String category;
        private String sector;
        private Integer durationMinutes;
        private Double baseTariff;
        private String description;
    }

    @lombok.Data
    public static class TwoFactorEnableRequest {
        private String otpCode;
    }
}
