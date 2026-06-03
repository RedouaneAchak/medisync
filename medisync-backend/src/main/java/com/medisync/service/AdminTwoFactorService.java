package com.medisync.service;

import com.medisync.dto.AdminTwoFactorStatusDto;
import com.medisync.model.enums.Role;
import com.medisync.model.sql.AdminTwoFactorProfile;
import com.medisync.model.sql.User;
import com.medisync.repository.sql.AdminTwoFactorProfileRepository;
import com.medisync.util.TotpUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminTwoFactorService {

    private final AdminTwoFactorProfileRepository repository;

    public AdminTwoFactorStatusDto getStatus(User adminUser) {
        validateAdmin(adminUser);
        return toStatus(ensureProfile(adminUser));
    }

    public AdminTwoFactorStatusDto enable(User adminUser, String otpCode) {
        validateAdmin(adminUser);
        AdminTwoFactorProfile profile = ensureProfile(adminUser);

        if (!TotpUtils.verifyCode(profile.getSecret(), otpCode)) {
            throw new RuntimeException("Code 2FA invalide.");
        }

        profile.setEnabled(true);
        profile.setEnabledAt(LocalDateTime.now());
        repository.save(profile);
        return toStatus(profile);
    }

    public boolean isTwoFactorEnabled(User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return false;
        }
        return repository.findById(user.getId())
                .map(AdminTwoFactorProfile::isEnabled)
                .orElse(false);
    }

    public boolean isSetupRequired(User user) {
        return user != null
                && user.getRole() == Role.ADMIN
                && !isTwoFactorEnabled(user);
    }

    public void validateOtp(User user, String otpCode) {
        if (!isTwoFactorEnabled(user)) {
            return;
        }
        AdminTwoFactorProfile profile = repository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("Configuration 2FA introuvable."));
        if (!TotpUtils.verifyCode(profile.getSecret(), otpCode)) {
            throw new RuntimeException("Code 2FA requis ou invalide pour le compte administrateur.");
        }
    }

    private AdminTwoFactorProfile ensureProfile(User adminUser) {
        return repository.findById(adminUser.getId()).orElseGet(() -> repository.save(
                AdminTwoFactorProfile.builder()
                        .user(adminUser)
                        .secret(TotpUtils.generateSecret())
                        .enabled(false)
                        .build()
        ));
    }

    private AdminTwoFactorStatusDto toStatus(AdminTwoFactorProfile profile) {
        boolean setupRequired = !profile.isEnabled();
        return AdminTwoFactorStatusDto.builder()
                .enabled(profile.isEnabled())
                .setupRequired(setupRequired)
                .secret(setupRequired ? profile.getSecret() : null)
                .provisioningUri(setupRequired
                        ? TotpUtils.buildProvisioningUri("MediSync", profile.getUser().getEmail(), profile.getSecret())
                        : null)
                .enabledAt(profile.getEnabledAt())
                .build();
    }

    private void validateAdmin(User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            throw new RuntimeException("La double authentification administrateur est réservée au rôle ADMIN.");
        }
    }
}
