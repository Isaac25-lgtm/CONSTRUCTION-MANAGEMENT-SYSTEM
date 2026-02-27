import { useAuthStore } from '../stores/authStore';

let isHandlingSessionExpiry = false;

/**
 * Clear local auth state and route to login without forcing a hard page reload.
 * Guarded so multiple concurrent 401 responses only trigger this once.
 */
export function handleSessionExpired(): void {
  if (isHandlingSessionExpiry) {
    return;
  }

  isHandlingSessionExpiry = true;

  localStorage.removeItem('access_token');
  localStorage.removeItem('selected_org_id');

  void useAuthStore.getState().logout();

  if (window.location.pathname !== '/login') {
    window.history.replaceState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  window.setTimeout(() => {
    isHandlingSessionExpiry = false;
  }, 500);
}
