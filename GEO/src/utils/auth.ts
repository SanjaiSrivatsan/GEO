/**
 * Authentication Utility Functions
 * Handles JWT token storage, retrieval, and removal
 */

const TOKEN_KEY = 'geo_auth_token';

/**
 * Store JWT token in localStorage
 * @param token - JWT access token from backend
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Retrieve JWT token from localStorage
 * @returns JWT token or null if not found
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove JWT token from localStorage (logout)
 */
export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated
 * @returns true if token exists, false otherwise
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}
