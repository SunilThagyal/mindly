"use client"; 

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
      <AlertCircle className="w-20 h-20 text-destructive mb-6" />
      <h1 className="text-4xl font-headline font-bold text-foreground mb-4">Something went wrong!</h1>
      <p className="text-lg text-muted-foreground mb-8">
        {error.message || "An unexpected error occurred. Please try again later."}
      </p>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        size="lg"
        className="bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        Try again
      </Button>
    </div>
  );
}
