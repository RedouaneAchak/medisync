package com.medisync.util;

import com.medisync.model.enums.Permission;
import com.medisync.model.enums.Role;

import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public final class RolePermissionCatalog {

    private RolePermissionCatalog() {
    }

    public static Set<Permission> defaultPermissionsFor(Role role) {
        if (role == null) {
            return Set.of();
        }

        return switch (role) {
            case ADMIN -> new LinkedHashSet<>(Arrays.asList(Permission.values()));
            case SECRETARY -> linkedSet(
                    Permission.MANAGE_PATIENTS,
                    Permission.MANAGE_APPOINTMENTS,
                    Permission.MANAGE_BILLING,
                    Permission.VIEW_FINANCIAL_REPORTS
            );
            case DOCTOR -> linkedSet(
                    Permission.MANAGE_DOCTOR_SCHEDULE,
                    Permission.MANAGE_MEDICAL_RECORDS,
                    Permission.VIEW_OWN_APPOINTMENTS
            );
            case PATIENT -> linkedSet(
                    Permission.BOOK_APPOINTMENTS,
                    Permission.VIEW_OWN_APPOINTMENTS,
                    Permission.VIEW_OWN_MEDICAL_HISTORY,
                    Permission.VIEW_OWN_BILLING,
                    Permission.MANAGE_SELF_PROFILE,
                    Permission.UPLOAD_MEDICAL_DOCUMENTS,
                    Permission.SUBMIT_FEEDBACK
            );
        };
    }

    public static Set<String> effectivePermissionNames(Role role, Set<Permission> extraPermissions) {
        LinkedHashSet<Permission> effective = new LinkedHashSet<>(defaultPermissionsFor(role));
        if (extraPermissions != null) {
            effective.addAll(extraPermissions);
        }
        return effective.stream()
                .map(Enum::name)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public static Set<String> availablePermissionNames() {
        return Arrays.stream(Permission.values())
                .map(Enum::name)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public static Map<String, Set<String>> roleDefaults() {
        EnumMap<Role, Set<String>> defaults = new EnumMap<>(Role.class);
        for (Role role : Role.values()) {
            defaults.put(role, effectivePermissionNames(role, Set.of()));
        }
        return defaults.entrySet().stream().collect(Collectors.toMap(
                entry -> entry.getKey().name(),
                Map.Entry::getValue,
                (left, right) -> left,
                java.util.LinkedHashMap::new
        ));
    }

    @SafeVarargs
    private static <T> LinkedHashSet<T> linkedSet(T... values) {
        return Arrays.stream(values)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
