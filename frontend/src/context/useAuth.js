import { useContext } from 'react';
import AuthContext from './AuthContext';

/**
 * Access the auth session (user, token, login/logout helpers).
 *
 * Lives apart from AuthContext.jsx because a module that exports both a
 * component and a plain function breaks React Fast Refresh — editing the
 * provider forced a full page reload and dropped app state.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
