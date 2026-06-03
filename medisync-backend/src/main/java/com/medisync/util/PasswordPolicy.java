package com.medisync.util;

import java.util.regex.Pattern;

public final class PasswordPolicy {
    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern DIGIT = Pattern.compile("\\d");
    private static final Pattern SPECIAL = Pattern.compile("[^A-Za-z0-9]");

    private PasswordPolicy() {
    }

    public static void validateOrThrow(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Le mot de passe doit contenir au moins 8 caractères.");
        }
        if (!UPPERCASE.matcher(password).find()) {
            throw new IllegalArgumentException("Le mot de passe doit contenir au moins une majuscule.");
        }
        if (!DIGIT.matcher(password).find()) {
            throw new IllegalArgumentException("Le mot de passe doit contenir au moins un chiffre.");
        }
        if (!SPECIAL.matcher(password).find()) {
            throw new IllegalArgumentException("Le mot de passe doit contenir au moins un caractère spécial.");
        }
    }
}
