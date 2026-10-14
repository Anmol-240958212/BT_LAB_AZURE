export type UserRole = 'CUSTOMER' | 'BANK_OFFICER' | 'ADMIN' | 'STAFF';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  phoneNumber?: string;
}

export interface VerifyOtpRequest {
  email?: string;
  phoneNumber?: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserProfileResponse {
  username: string;
  email: string;
  phoneNumber?: string;
  role: string;
  customerId?: number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  preferredLanguage?: string;
  countryOfOrigin?: string;
  customerStatus?: string;
  identificationType?: string;
  identificationNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  maskedEmail?: string;
  maskedMobileNumber?: string;
}

export interface UserUpdateRequest {
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  preferredLanguage?: string;
  countryOfOrigin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface CustomerProfileRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  preferredLanguage?: string;
  countryOfOrigin?: string;
  identificationType: string;
  identificationNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  mobileNumber?: string;
  email?: string;
}

export interface CustomerProfileResponse {
  message: string;
  status: string;
  customerId: number;
  fullName: string;
}

export interface OpenAccountRequest {
  productId: number;
  branchId: number;
}

export interface OpenAccountResponse {
  message: string;
  accountId: number;
  accountNumber: string;
  status: string;
  productId: number;
  branchId: number;
  openedOn: string;
}

export interface CreateEmployeeRequest {
  username: string;
  password: string;
  email: string;
  phoneNumber?: string;
}

export interface EmployeeResponse {
  userId: number;
  username: string;
  email: string;
  phoneNumber?: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  displayName?: string | null;
  role: UserRole | null;
  token: string | null;
}
