import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import Header from '@/components/layout/header';
import { cn } from '@/lib/utils';
import { Montserrat, Merriweather, Lora } from 'next/font/google';

// Define fonts with subsets and weights
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-merriweather',
  weight: ['300', '400', '700', '900'],
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Blogchain',
  description: 'A decentralized blogging platform where creativity pays.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(montserrat.variable, merriweather.variable, lora.variable)}>
      <head>
        {/* Google Fonts preconnect - Next/font handles optimal loading */}
      </head>
      <body className={cn("font-body antialiased flex flex-col min-h-screen")}>
        <AuthProvider>
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          {/* Placeholder for Mobile Sticky Anchor Ad - visible only on mobile */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 h-12 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center z-50 border-t border-border">
            <span className="text-sm text-muted-foreground">Ad Placeholder (320x50)</span>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
