package com.example.auth.dto;

public class CustomerProfileResponseDto {

    private String message;
    private String status;
    private Long customerId;
    private String fullName;
    private String gender;
    private String customerType;
    private String classificationType;
    private String classificationValue;
    private String identificationType;
    private String maskedIdentificationNumber;
    private String maskedEmail;
    private String maskedMobileNumber;
    private String addressLine1;
    private String city;
    private String state;
    private String country;
    private String postalCode;

    public String getMessage() {
        return message;
    }
    public void setMessage(String message) {
        this.message = message;
    }
    public String getStatus() {
        return status;
    }
    public void setStatus(String status) {
        this.status = status;
    }
    public Long getCustomerId() {
        return customerId;
    }
    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }
    public String getFullName() {
        return fullName;
    }
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getCustomerType() { return customerType; }
    public void setCustomerType(String customerType) { this.customerType = customerType; }
    public String getClassificationType() { return classificationType; }
    public void setClassificationType(String classificationType) { this.classificationType = classificationType; }
    public String getClassificationValue() { return classificationValue; }
    public void setClassificationValue(String classificationValue) { this.classificationValue = classificationValue; }
    public String getIdentificationType() { return identificationType; }
    public void setIdentificationType(String identificationType) { this.identificationType = identificationType; }
    public String getMaskedIdentificationNumber() { return maskedIdentificationNumber; }
    public void setMaskedIdentificationNumber(String maskedIdentificationNumber) { this.maskedIdentificationNumber = maskedIdentificationNumber; }
    public String getMaskedEmail() { return maskedEmail; }
    public void setMaskedEmail(String maskedEmail) { this.maskedEmail = maskedEmail; }
    public String getMaskedMobileNumber() { return maskedMobileNumber; }
    public void setMaskedMobileNumber(String maskedMobileNumber) { this.maskedMobileNumber = maskedMobileNumber; }
    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
}
