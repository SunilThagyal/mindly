
import type {NextConfig} from 'next';

// Log the value of ADMIN_USER_UID when next.config.ts is processed
// This log will appear in the terminal where your Next.js server is running.
console.log('[next.config.ts] ADMIN_USER_UID from server process.env:', process.env.ADMIN_USER_UID);

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  reactStrictMode: false, // Disabled Strict Mode
  env: {
    ADMIN_USER_UID: process.env.ADMIN_USER_UID,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // If you have this for client-side use
  }
};

export default nextConfig;
