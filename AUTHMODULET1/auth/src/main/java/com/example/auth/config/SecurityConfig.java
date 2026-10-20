package com.example.auth.config;

import com.example.auth.security.JwtAuthenticationFilter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(swaggerCors()))

                .sessionManagement(session -> session.sessionCreationPolicy(
                        SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth

                        // Swagger UI and OpenAPI documentation
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/webjars/**").permitAll()

                        // Registration
                        .requestMatchers("/auth/register").permitAll()

                        // OTP verification
                        .requestMatchers("/auth/verify-otp").permitAll()

                        // Login
                        .requestMatchers("/auth/login").permitAll()

                        // refresh token
                        .requestMatchers("/auth/refresh").permitAll()

                        // forgot password which leads to reset password
                        .requestMatchers("/auth/forgot-password").permitAll()

                        // reset password
                        .requestMatchers("/auth/reset-password").permitAll()

                        // Check username availability
                        .requestMatchers("/auth/check-username").permitAll()

                        // Everything else requires JWT
                        .anyRequest().authenticated())

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource swaggerCors() {
        var cors = new org.springframework.web.cors.CorsConfiguration();
        cors.setAllowedOriginPatterns(java.util.List.of(
                "http://localhost:[*]",
                "http://127.0.0.1:[*]"
        ));
        cors.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        cors.setAllowedHeaders(java.util.List.of("*"));
        cors.setAllowCredentials(true);
        var source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }
}
