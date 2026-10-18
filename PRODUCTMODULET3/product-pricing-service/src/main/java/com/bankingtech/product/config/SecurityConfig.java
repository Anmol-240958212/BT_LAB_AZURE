package com.bankingtech.product.config;

import java.util.List;
import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.bankingtech.product.security.JwtAuthenticationFilter;
import com.bankingtech.product.security.ApiSecurityErrorHandler;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Value("${product.cors.allowed-origin-patterns}")
    private String allowedOriginPatterns;

    @Bean
    SecurityFilterChain productSecurityFilterChain(HttpSecurity http,
                                                    JwtAuthenticationFilter jwtFilter,
                                                    ApiSecurityErrorHandler securityErrors) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(securityErrors)
                        .accessDeniedHandler(securityErrors))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/api/health/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Customers may read product terms and request a rate quote. The controller
                        // keeps mutations restricted to bank officers and administrators.
                        .requestMatchers("/api/**").hasAnyRole("CUSTOMER", "STAFF", "BANK_OFFICER", "ADMIN")
                        .anyRequest().denyAll())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.stream(allowedOriginPatterns.split("\\|"))
                .map(String::trim).filter(value -> !value.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
