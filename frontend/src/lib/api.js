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
 * Core fetch wrapper for JSON requests.
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

/**
 * Core fetch wrapper for FormData (e.g. file uploads).
 */
async function requestFormData(path, formData, { auth = true } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
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

export const apiResendSignupOtp = (email) =>
  request('/user/signup/resend-otp', { method: 'POST', body: email ? { email } : {}, auth: true });

export const apiVerifyEmailOtp = (payload) =>
  request('/user/signup/verify-otp', { method: 'POST', body: typeof payload === 'string' ? { otp: payload } : payload, auth: true });

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

/* NOT IMPLEMENTED ON THE BACKEND YET — these routes do not exist, so both calls
   return 404. Do not wire them into a page until /user/request-email-change and
   /user/verify-email-change are added. */
export const apiRequestEmailChange = (newEmail) =>
  request('/user/request-email-change', { method: 'POST', body: { newEmail }, auth: true });

export const apiVerifyEmailChange = (token) =>
  request(`/user/verify-email-change?token=${encodeURIComponent(token)}`, { auth: false });

/* ---- Products / Marketplace ---- */
// Drops empty values so `?category=&city=` never reaches the backend as a filter.
const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const apiGetProducts = (params = {}) =>
  request(`/product${toQuery(params)}`, { auth: false });

export const apiGetMyProducts = () => request('/product/my-products', { auth: true });

export const apiGetProductById = (id) => request(`/product/${id}`, { auth: false });

export const apiCreateProduct = (payload) =>
  request('/product', { method: 'POST', body: payload, auth: true });

export const apiUpdateProduct = (id, payload) =>
  request(`/product/${id}`, { method: 'PATCH', body: payload, auth: true });

export const apiDeleteProduct = (id) =>
  request(`/product/${id}`, { method: 'DELETE', auth: true });

/* ---- Sourcing Requests ---- */
export const apiGetSourcingRequests = (params = {}) =>
  request(`/sourcing-requests${toQuery(params)}`, { auth: false });

export const apiGetMySourcingRequests = () =>
  request('/sourcing-requests/my-requests', { auth: true });

/** Requests other buyers have raised against MY listings. */
export const apiGetReceivedSourcingRequests = () =>
  request('/sourcing-requests/received', { auth: true });

export const apiGetSourcingRequestById = (id) =>
  request(`/sourcing-requests/${id}`, { auth: false });

export const apiCreateSourcingRequest = (payload) =>
  request('/sourcing-requests', { method: 'POST', body: payload, auth: true });

export const apiUpdateSourcingRequest = (id, payload) =>
  request(`/sourcing-requests/${id}`, { method: 'PATCH', body: payload, auth: true });

export const apiUpdateSourcingRequestStatus = (id, status) =>
  request(`/sourcing-requests/${id}/status`, { method: 'PATCH', body: { status }, auth: true });

export const apiDeleteSourcingRequest = (id) =>
  request(`/sourcing-requests/${id}`, { method: 'DELETE', auth: true });

/* ---- Logistics & Freight ---- */
export const apiEstimateFreight = (payload) =>
  request('/logistics/estimate', { method: 'POST', body: payload, auth: false });

export const apiBookShipment = (payload) =>
  request('/logistics/book', { method: 'POST', body: payload, auth: true });

export const apiGetMyShipments = () => request('/logistics/my-shipments', { auth: true });

export const apiTrackShipment = (waybillNumber) =>
  request(`/logistics/track/${encodeURIComponent(waybillNumber)}`, { auth: false });

export const apiUpdateShipmentStatus = (waybillNumber, payload) =>
  request(`/logistics/shipments/${encodeURIComponent(waybillNumber)}/status`, { method: 'PATCH', body: payload, auth: true });

/* ---- File & Image Uploads ---- */
export const apiUploadImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return requestFormData('/upload/image', formData, { auth: true });
};

export const apiUploadImages = (files) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('images', file));
  return requestFormData('/upload/images', formData, { auth: true });
};

/* ---- Payments (Razorpay) ---------------------------------------------------
   The browser never sends an amount. It sends what it is buying — listing,
   quantity, destination pincode — and the server prices it from the database.
   -------------------------------------------------------------------------- */

/** Whether the server has Razorpay keys, plus the publishable key id. */
export const apiGetPaymentConfig = () => request('/payment/config', { auth: false });

/** Price breakdown to show before the buyer commits. */
export const apiGetPaymentQuote = (payload) =>
  request('/payment/quote', { method: 'POST', body: payload, auth: true });

/** Creates the Razorpay order to hand to checkout. */
export const apiCreatePaymentOrder = (payload) =>
  request('/payment/order', { method: 'POST', body: payload, auth: true });

/** Sends the checkout callback back for signature verification. Never trust the
    browser's word that a payment succeeded — this is what makes it official. */
export const apiVerifyPayment = (payload) =>
  request('/payment/verify', { method: 'POST', body: payload, auth: true });

export const apiMarkPaymentFailed = (razorpayOrderId, reason) =>
  request('/payment/failed', {
    method: 'POST',
    body: { razorpay_order_id: razorpayOrderId, reason },
    auth: true,
  });

export const apiGetMyOrders = () => request('/payment/my-orders', { auth: true });

/* ---- Display helpers ---- */

/**
 * The backend stores roles prefixed — 'ROLE_SELLER' / 'ROLE_BUYER' / 'ROLE_ADMIN'.
 * Rendering `user.role` straight out of the API showed users "ROLE_SELLER".
 */
export const roleLabel = (role) => {
  switch (role) {
    case 'ROLE_SELLER': return 'Generator';
    case 'ROLE_BUYER': return 'Upcycler';
    case 'ROLE_ADMIN': return 'Admin';
    default: return 'Member';
  }
};

export const logout = () => clearToken();
