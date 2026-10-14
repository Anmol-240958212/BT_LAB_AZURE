import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthState, LoginResponse, UserRole } from './models/auth.models';

const ACCESS_TOKEN_KEY = 'btlab_access_token';
const REFRESH_TOKEN_KEY = 'btlab_refresh_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private inMemoryAccessToken: string | null = null;
  private inMemoryRefreshToken: string | null = null;

  private readonly authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    username: null,
    role: null,
    token: null
  });

  public readonly authState$: Observable<AuthState> = this.authStateSubject.asObservable();

  constructor() {
    this.restoreSessionFromStorage();
  }

  /**
   * Restores existing session from localStorage if present
   */
  private restoreSessionFromStorage(): void {
    try {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (storedToken && !this.isTokenExpired(storedToken)) {
        this.inMemoryAccessToken = storedToken;
        this.inMemoryRefreshToken = storedRefreshToken;
        const decoded = this.decodeJwtPayload(storedToken);

        const displayName = this.getDisplayName(decoded.username);
        this.authStateSubject.next({
          isAuthenticated: true,
          username: decoded.username,
          displayName,
          role: decoded.role,
          token: storedToken
        });
      } else if (storedToken) {
        this.clearSession();
      }
    } catch {
      this.clearSession();
    }
  }

  /**
   * Sets the active session after successful authentication
   */
  public setSession(authResponse: LoginResponse): void {
    this.inMemoryAccessToken = authResponse.accessToken;
    this.inMemoryRefreshToken = authResponse.refreshToken;

    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, authResponse.accessToken);
      if (authResponse.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);
      }
    } catch {
      // In-memory fallback if localStorage is disabled
    }

    const decoded = this.decodeJwtPayload(authResponse.accessToken);
    const displayName = this.getDisplayName(decoded.username);
    this.authStateSubject.next({
      isAuthenticated: true,
      username: decoded.username,
      displayName,
      role: decoded.role,
      token: authResponse.accessToken
    });
  }

  /**
   * Updates only the access token (e.g. after refresh)
   */
  public updateAccessToken(newToken: string): void {
    this.inMemoryAccessToken = newToken;
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
    } catch {
      // fallback
    }

    const decoded = this.decodeJwtPayload(newToken);
    const displayName = this.getDisplayName(decoded.username);
    this.authStateSubject.next({
      ...this.authStateSubject.value,
      isAuthenticated: true,
      username: decoded.username,
      displayName,
      role: decoded.role,
      token: newToken
    });
  }

  /**
   * Returns current access token
   */
  public getToken(): string | null {
    return this.inMemoryAccessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Returns current refresh token
   */
  public getRefreshToken(): string | null {
    return this.inMemoryRefreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Checks whether the user is logged in
   */
  public isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  /**
   * Returns active user's role
   */
  public getRole(): UserRole | null {
    return this.authStateSubject.value.role;
  }

  /**
   * Returns active user's username
   */
  public getUsername(): string | null {
    return this.authStateSubject.value.username;
  }

  /**
   * Formats a clean human display name from email or username
   * e.g. "jack.uat.2026@example.com" -> "Jack"
   * e.g. "alice@test.com" -> "Alice"
   * e.g. "bankadmin2026@gmail.com" -> "Bank Administrator"
   */
  public getDisplayName(identifier?: string | null): string {
    const raw = identifier ?? this.authStateSubject.value.username;
    if (!raw) return 'Member';

    // If it's an email address
    if (raw.includes('@')) {
      const local = raw.split('@')[0];
      const noDigits = local.replace(/\d+/g, '');
      const parts = noDigits.split(/[._-]+/).filter(p => p.length > 0);

      if (parts.length > 0) {
        const first = parts[0];
        if (first.toLowerCase() === 'bankadmin' || first.toLowerCase() === 'admin') {
          return 'Bank Administrator';
        }
        const envWords = ['uat', 'test', 'demo', 'prod', 'dev', 'qa', 'stag', 'staging', 'corp', 'user', 'temp', 'banking'];
        if (parts.length > 1 && !envWords.includes(parts[1].toLowerCase()) && parts[1].length > 1) {
          const second = parts[1];
          return `${first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()} ${second.charAt(0).toUpperCase() + second.slice(1).toLowerCase()}`;
        }
        return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
      }
      return local.charAt(0).toUpperCase() + local.slice(1);
    }

    // If it's a prefixed username e.g. officer_sharma, admin_master, customer1
    const clean = raw.replace(/^(officer_|admin_|user_)/i, '').replace(/\d+/g, '');
    const parts = clean.split(/[._-]+/).filter(p => p.length > 0);
    if (parts.length > 0) {
      const first = parts[0];
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    }

    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  /**
   * Clears session in memory and localStorage
   */
  public clearSession(): void {
    this.inMemoryAccessToken = null;
    this.inMemoryRefreshToken = null;

    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }

    this.authStateSubject.next({
      isAuthenticated: false,
      username: null,
      displayName: null,
      role: null,
      token: null
    });
  }

  /**
   * Logs out the user
   */
  public logout(): void {
    this.clearSession();
  }

  /**
   * Decodes JWT token payload safely without external dependencies
   */
  public decodeJwtPayload(token: string): { username: string | null; role: UserRole | null; exp?: number } {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return { username: null, role: null };
      }

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(decodedJson);

      const username = parsed.sub || parsed.username || null;
      let rawRole: string = parsed.role || parsed.roles || (Array.isArray(parsed.authorities) ? parsed.authorities[0] : null) || 'CUSTOMER';

      if (rawRole.startsWith('ROLE_')) {
        rawRole = rawRole.substring(5);
      }

      const normalizedRole: UserRole = (['CUSTOMER', 'BANK_OFFICER', 'ADMIN', 'STAFF'].includes(rawRole)
        ? rawRole
        : 'CUSTOMER') as UserRole;

      return {
        username,
        role: normalizedRole,
        exp: parsed.exp
      };
    } catch {
      return { username: null, role: null };
    }
  }

  /**
   * Checks whether a JWT token is expired
   */
  public isTokenExpired(token: string): boolean {
    const { exp } = this.decodeJwtPayload(token);
    if (!exp) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return exp < nowInSeconds;
  }
}
