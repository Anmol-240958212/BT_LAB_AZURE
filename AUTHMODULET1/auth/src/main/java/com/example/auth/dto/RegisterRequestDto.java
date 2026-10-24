package com.example.auth.dto;

public class RegisterRequestDto {

    private String name;
    private String username;
    private String email;
    private String phoneNumber;
    private String password;

    public RegisterRequestDto() {
    }

    public String getName() {
        if (name != null && !name.isBlank()) {
            return name;
        }
        return username;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUsername() {
        if (username != null && !username.isBlank()) {
            return username;
        }
        return name;
    }

    public void setUsername(String username) {
        this.username = username;
        if (this.name == null || this.name.isBlank()) {
            this.name = username;
        }
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}