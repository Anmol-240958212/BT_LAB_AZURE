package com.bankingtech.product.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Validates the Auth service's signed JWT and maps its role claim to Spring authorities. */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final SecretKey signingKey;

    public JwtAuthenticationFilter(@Value("${product.jwt.secret}") String secret, Environment environment) {
        boolean localProfile = java.util.Arrays.asList(environment.getActiveProfiles()).contains("local");
        if (secret == null || secret.isBlank() || secret.contains("${")
                || secret.toLowerCase(java.util.Locale.ROOT).contains("replace-with")
                || (!localProfile && secret.equals("local-development-only-change-me-32-bytes-minimum"))) {
            throw new IllegalArgumentException("AUTH_JWT_SECRET must be a non-placeholder production secret");
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                String token = header.substring(7).trim();
                Claims claims = Jwts.parser().verifyWith(signingKey).build()
                        .parseSignedClaims(token).getPayload();
                String subject = claims.getSubject();
                String role = claims.get("role", String.class);
                if (subject != null && !subject.isBlank() && role != null && !role.isBlank()) {
                    var authorities = List.of(new SimpleGrantedAuthority(
                            role.startsWith("ROLE_") ? role : "ROLE_" + role));
                    var authentication = new UsernamePasswordAuthenticationToken(subject, null, authorities);
                    authentication.setDetails(claims);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (RuntimeException invalidToken) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
