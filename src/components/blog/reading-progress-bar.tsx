
"use client";

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (totalHeight > 0) {
        setProgress((window.scrollY / totalHeight) * 100);
      } else {
        // No scrollbar means content fits viewport, so it's fully "visible"
        setProgress(100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Set initial progress

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1.5 w-full z-50">
        <Progress value={progress} className="h-full rounded-none bg-transparent" />
    </div>
  );
}
