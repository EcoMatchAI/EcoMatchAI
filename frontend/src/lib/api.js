/* ============================================================================
   API client — talks to the EcoMatch backend (Express + MongoDB + JWT).
   Token is stored in localStorage and sent as `Authorization: Bearer <token>`.
   ============================================================================ */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'ecomatch_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();

/**
 * Core fetch wrapper. Attaches the JWT, parses JSON, and throws an Error
 * (with .status and .data) when the response is not ok.
 */
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('Cannot reach the server. Is the backend running?');
    err.status = 0;
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no/invalid JSON body */
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/* ---- Auth ---- */
export const apiSignup = (payload) =>
  request('/auth/signup', { method: 'POST', body: payload, auth: false });

export const apiLogin = (payload) =>
  request('/auth/login', { method: 'POST', body: payload, auth: false });

export const apiGetMe = () => request('/auth/me');

/* ---- Email verification ---- */
export const apiVerifyEmail = (token) =>
  request(`/auth/verify-email?token=${encodeURIComponent(token)}`, { auth: false });

export const apiResendVerification = (email) =>
  request('/auth/resend-verification', { method: 'POST', body: { email }, auth: false });

export const apiRequestEmailChange = (newEmail) =>
  request('/auth/request-email-change', { method: 'POST', body: { newEmail } });

export const apiVerifyEmailChange = (token) =>
  request(`/auth/verify-email-change?token=${encodeURIComponent(token)}`, { auth: false });

/* ---- Profile ---- */
export const apiGetProfile = () => request('/profile');

export const apiCompleteProfile = (payload) =>
  request('/profile/complete', { method: 'POST', body: payload });

export const apiUpdateProfile = (payload) =>
  request('/profile', { method: 'PATCH', body: payload });

export const logout = () => clearToken();
