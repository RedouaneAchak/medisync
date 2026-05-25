package com.medisync.dto;

import lombok.Data;

@Data
public class GoogleLoginRequest {
    private String idToken; // The token Angular gets from Google
}