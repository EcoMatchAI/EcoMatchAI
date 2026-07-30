/* ============================================================================
   API client — talks to the EcoMatch backend (Express + MongoDB + JWT).
   Token is stored in localStorage and sent as `Authorization: Bearer <token>`.
   ============================================================================ */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'ecomatch_token';
const PENDING_EMAIL_KEY = 'ecomatch_pending_email';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PENDING_EMAIL_KEY);
};
export const isLoggedIn = () => !!getToken();

export const getPendingEmail = () => localStorage.getItem(PENDING_EMAIL_KEY);
export const setPendingEmail = (email) => localStorage.setItem(PENDING_EMAIL_KEY, email);

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

/* ---- Registration & Auth ---- */
export const apiSignup = (payload) =>
  request('/user/signup/', { method: 'POST', body: payload, auth: false });

export const apiVerifyEmailOtp = (payload) =>
  request('/user/signup/verify-otp', { method: 'POST', body: payload, auth: false });

export const apiCompleteProfile = (payload) =>
  request('/user/signup/complete-profile', { method: 'POST', body: payload, auth: true });

export const apiLogin = (payload) =>
  request('/auth/login', { method: 'POST', body: payload, auth: false });

export const apiGetMe = () => request('/auth/me', { auth: true });

export const apiLogout = () => request('/auth/logout', { method: 'POST', auth: true });

/* ---- Password Reset ---- */
export const apiForgotPassword = (email) =>
  request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });

export const apiResetPassword = (payload) =>
  request('/auth/reset-password', { method: 'POST', body: payload, auth: false });

/* ---- Profile Management ---- */
export const apiGetProfile = () => request('/user/profile', { auth: true });

export const apiUpdateProfile = (payload) =>
  request('/user/', { method: 'PATCH', body: payload, auth: true });

export const apiRequestEmailChange = (newEmail) =>
  request('/user/request-email-change', { method: 'POST', body: { newEmail }, auth: true });

export const apiVerifyEmailChange = (token) =>
  request(`/user/verify-email-change?token=${encodeURIComponent(token)}`, { auth: false });

export const logout = () => clearToken();
