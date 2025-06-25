
"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MediaLightboxProps {
  src: string;
  type: 'image' | 'video';
  onClose: () => void;
}

export default function MediaLightbox({ src, type, onClose }: MediaLightboxProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/10 h-10 w-10 z-10"
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <X className="h-6 w-6" />
        <span className="sr-only">Close</span>
      </Button>
      <div
        className="relative w-full h-full max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on media
      >
        {type === 'video' ? (
          <video
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg outline-none"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={src}
            alt="Lightbox content"
            className="max-w-full max-h-full rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
}
