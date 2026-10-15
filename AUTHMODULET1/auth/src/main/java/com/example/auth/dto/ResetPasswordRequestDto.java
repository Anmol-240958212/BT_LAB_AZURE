package com.example.auth.dto;

public class ResetPasswordRequestDto {

	String identifier;
	String otp;
	String token;
	String newPassword;
	String confirmPassword;

	public ResetPasswordRequestDto() {
	}
	public String getIdentifier() {
		return identifier;
	}
	public void setIdentifier(String identifier) {
		this.identifier = identifier;
	}
	public String getOtp() {
		return otp != null ? otp : token;
	}
	public void setOtp(String otp) {
		this.otp = otp;
	}
	public String getToken() {
		return token != null ? token : otp;
	}
	public void setToken(String token) {
		this.token = token;
		if (this.otp == null) {
			this.otp = token;
		}
	}
	public String getNewPassword() {
		return newPassword;
	}
	public void setNewPassword(String newPassword) {
		this.newPassword = newPassword;
	}	
	public String getConfirmPassword() {
		return confirmPassword != null ? confirmPassword : newPassword;
	}
	public void setConfirmPassword(String confirmPassword) {
		this.confirmPassword = confirmPassword;
	}
}
