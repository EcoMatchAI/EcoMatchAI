import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getToken, setToken, clearToken, isLoggedIn,
  getPendingEmail, setPendingEmail,
  apiLogin, apiSignup, apiVerifyEmailOtp, apiCompleteProfile,
  apiGetMe, apiLogout
} from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  // Fetch current user on initial mount if token is present
  const refreshUser = async () => {
    const currentToken = getToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await apiGetMe();
      if (res?.user) {
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      console.warn('Auth token verification failed:', err.message);
      clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const handleLogin = async (email, password) => {
    const res = await apiLogin({ email, password });
    if (res?.token) {
      setToken(res.token);
      setTokenState(res.token);
      setUser(res.user || null);
    }
    return res;
  };

  const handleSignup = async ({ businessName, email, password, confirmPassword }) => {
    const res = await apiSignup({ businessName, email, password, confirmPassword });
    if (res?.tempToken) {
      setToken(res.tempToken);
      setTokenState(res.tempToken);
    }
    if (res?.email) {
      setPendingEmail(res.email);
    }
    return res;
  };

  const handleVerifyOtp = async (email, otp) => {
    const res = await apiVerifyEmailOtp({ email, otp });
    if (res?.verificationToken) {
      setToken(res.verificationToken);
      setTokenState(res.verificationToken);
    }
    return res;
  };

  const handleCompleteProfile = async (profileData) => {
    const res = await apiCompleteProfile(profileData);
    if (res?.authToken) {
      setToken(res.authToken);
      setTokenState(res.authToken);
    }
    if (res?.user) {
      setUser(res.user);
    }
    return res;
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore API logout errors, clean up locally
    }
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  const value = {
    user,
    setUser,
    token,
    loading,
    isAuthenticated: !!user && isLoggedIn(),
    isLoggedIn: isLoggedIn(),
    getPendingEmail,
    login: handleLogin,
    signup: handleSignup,
    verifyOtp: handleVerifyOtp,
    completeProfile: handleCompleteProfile,
    logout: handleLogout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
