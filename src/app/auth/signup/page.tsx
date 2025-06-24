import AuthForm from '@/components/auth/auth-form';
import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: `Create an account to join ${siteConfig.name} and start sharing your thoughts.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  return <AuthForm mode="signup" />;
}
