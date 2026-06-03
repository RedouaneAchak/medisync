package com.medisync.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;

public final class TotpUtils {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private TotpUtils() {
    }

    public static String generateSecret() {
        byte[] buffer = new byte[20];
        SECURE_RANDOM.nextBytes(buffer);
        return encodeBase32(buffer);
    }

    public static String buildProvisioningUri(String issuer, String accountName, String secret) {
        String label = urlEncode(issuer + ":" + accountName);
        return "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=" + urlEncode(issuer);
    }

    public static boolean verifyCode(String secret, String code) {
        if (secret == null || secret.isBlank() || code == null || code.isBlank()) {
            return false;
        }

        String normalizedCode = code.replaceAll("\\s+", "");
        if (!normalizedCode.matches("\\d{6}")) {
            return false;
        }

        long currentTimeStep = System.currentTimeMillis() / 1000L / 30L;
        for (long offset = -1; offset <= 1; offset++) {
            if (generateTotp(secret, currentTimeStep + offset).equals(normalizedCode)) {
                return true;
            }
        }
        return false;
    }

    private static String generateTotp(String secret, long timeStep) {
        try {
            byte[] key = decodeBase32(secret);
            byte[] data = ByteBuffer.allocate(8).putLong(timeStep).array();

            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));

            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            int otp = binary % 1_000_000;
            return String.format(Locale.ROOT, "%06d", otp);
        } catch (Exception exception) {
            throw new RuntimeException("Impossible de calculer le code TOTP.", exception);
        }
    }

    private static String encodeBase32(byte[] bytes) {
        StringBuilder builder = new StringBuilder((bytes.length * 8 + 4) / 5);
        int buffer = 0;
        int bitsLeft = 0;

        for (byte current : bytes) {
            buffer = (buffer << 8) | (current & 0xFF);
            bitsLeft += 8;

            while (bitsLeft >= 5) {
                int index = (buffer >> (bitsLeft - 5)) & 0x1F;
                bitsLeft -= 5;
                builder.append(BASE32_ALPHABET.charAt(index));
            }
        }

        if (bitsLeft > 0) {
            int index = (buffer << (5 - bitsLeft)) & 0x1F;
            builder.append(BASE32_ALPHABET.charAt(index));
        }

        return builder.toString();
    }

    private static byte[] decodeBase32(String value) {
        String normalized = value.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        ByteBuffer buffer = ByteBuffer.allocate((normalized.length() * 5) / 8);
        int bits = 0;
        int accumulator = 0;

        for (char character : normalized.toCharArray()) {
            int index = BASE32_ALPHABET.indexOf(character);
            if (index < 0) {
                throw new IllegalArgumentException("Secret TOTP invalide.");
            }

            accumulator = (accumulator << 5) | index;
            bits += 5;

            if (bits >= 8) {
                buffer.put((byte) ((accumulator >> (bits - 8)) & 0xFF));
                bits -= 8;
            }
        }

        byte[] result = new byte[buffer.position()];
        buffer.flip();
        buffer.get(result);
        return result;
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
