"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
      <AlertTriangle className="w-24 h-24 text-destructive mb-6" />
      <h1 className="text-5xl font-headline font-bold text-foreground mb-4">404 - Page Not Found</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Oops! The page you&apos;re looking for doesn&apos;t seem to exist.
      </p>
      <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <Link href="/">Go Back to Homepage</Link>
      </Button>
    </div>
  );
}
