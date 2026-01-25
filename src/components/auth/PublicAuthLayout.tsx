import { Outlet } from 'react-router-dom';
import AuthLayout from './AuthLayout';

/**
 * Persistent layout shell for public authentication routes.
 * Keeps AuthLayout (logo, background, language selector) mounted
 * while only the form content changes via Outlet.
 */
export default function PublicAuthLayout() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
