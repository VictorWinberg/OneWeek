import { useAuthStore } from '@/stores/authStore';
import GoogleIcon from '@/assets/icons/google.svg?react';

export function LoginButton() {
  const { login } = useAuthStore();

  return (
    <button
      onClick={login}
      className="flex items-center gap-3 px-6 py-3 bg-white text-gray-800 rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
    >
      <GoogleIcon className="w-5 h-5" aria-hidden="true" />
      Logga in med Google
    </button>
  );
}

export function LogoutButton() {
  const { logout, user } = useAuthStore();

  return (
    <div className="flex items-center gap-3">
      {user && (
        <div className="flex items-center gap-2">
          {user.picture && <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />}
        </div>
      )}
      <button
        onClick={logout}
        className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
      >
        Logga ut
      </button>
    </div>
  );
}
