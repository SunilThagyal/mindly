import AuthForm from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to your account to continue your journey.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
