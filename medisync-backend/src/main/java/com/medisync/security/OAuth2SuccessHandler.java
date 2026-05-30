package com.medisync.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // 1. Extraire l'email de Google (juste pour vérifier que ça marche)
        String email = oAuth2User.getAttribute("email");
        System.out.println("Google Login Réussi pour : " + email);

        // 2. GÉNÉRER LE TOKEN JWT
        // Pour l'instant, on met un faux token pour tester la redirection.
        // Plus tard, vous appellerez votre JwtService ici : jwtService.generateToken(user);
        String jwtToken = "VOTRE_VRAI_TOKEN_GENERE_ICI"; 

        // 3. Construire l'URL de retour vers Angular avec le token caché dedans
        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:4200/login")
                .queryParam("token", jwtToken)
                .build().toUriString();

        // 4. Rediriger le navigateur vers Angular
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}