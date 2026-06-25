import { useAuthContext } from '../context/AuthContext';

export function useAuth() {
  const { user, token, loading, login, logout, fetchProfile } = useAuthContext();

  return {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    fetchProfile,
  };
}
