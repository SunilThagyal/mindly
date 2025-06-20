
"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveMediaContainerProps {
  src: string;
  alt?: string; // Required for images for accessibility
  type: 'image' | 'video';
  containerClassName?: string;
  mediaClassName?: string;
  blurAmount?: string; // e.g., '10px', '20px'
  videoProps?: Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'className' | 'style'>; // Allow standard video attributes
}

const ResponsiveMediaContainer: React.FC<ResponsiveMediaContainerProps> = ({
  src,
  alt,
  type,
  containerClassName,
  mediaClassName,
  blurAmount = '20px',
  videoProps,
}) => {
  if (type === 'image' && !alt) {
    // This warning is helpful during development but won't break the app.
    // In a real app, you might enforce 'alt' more strictly or handle it differently.
    console.warn("ResponsiveMediaContainer: 'alt' prop is recommended for type 'image' for accessibility.");
  }

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden bg-black', // bg-black for fallback if image is transparent
        containerClassName
      )}
    >
      {/* Blurred background media */}
      {type === 'image' ? (
        <img
          src={src}
          alt="" // Decorative background, main alt is on the content image
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            filter: `blur(${blurAmount})`,
            transform: 'scale(1.15)', // Scale slightly more to ensure blur covers edges
          }}
          aria-hidden="true"
          decoding="async" // For potentially large background images
          loading="lazy"    // For potentially large background images
        />
      ) : (
        <video
          src={src}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            filter: `blur(${blurAmount})`,
            transform: 'scale(1.15)',
          }}
          autoPlay
          muted
          loop
          playsInline // Important for autoplay on iOS and other mobile browsers
          aria-hidden="true"
        />
      )}

      {/* Main content media (visible, not blurred) */}
      {type === 'image' ? (
        <img
          src={src}
          alt={alt || 'Displayed media'}
          className={cn(
            'relative z-10 w-full h-full object-contain drop-shadow-lg', // Added drop-shadow for better separation
            mediaClassName
          )}
        />
      ) : (
        <video
          src={src}
          className={cn(
            'relative z-10 w-full h-full object-contain drop-shadow-lg',
            mediaClassName
          )}
          {...videoProps} // Spread other video props like controls, autoPlay, muted, loop
        />
      )}
    </div>
  );
};

export default ResponsiveMediaContainer;
