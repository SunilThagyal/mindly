
"use client";

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // The target element is the article content wrapper
      const articleElement = document.getElementById('blog-article-content');
      
      // If we're on a page without the article, don't show the bar
      if (!articleElement) {
        setProgress(0);
        return;
      }

      const rect = articleElement.getBoundingClientRect();
      
      // How far down the page we've scrolled
      const scrollY = window.scrollY;
      
      // The distance from the top of the document to the top of the article
      const articleTop = rect.top + scrollY;

      // If we haven't scrolled to the article yet, progress is 0
      if (scrollY < articleTop) {
        setProgress(0);
        return;
      }

      // The height of the article content itself
      const articleHeight = articleElement.scrollHeight;
      const viewportHeight = window.innerHeight;

      // The total scrollable distance for the article is its height minus the viewport height.
      // This means progress becomes 100% when the *bottom* of the article aligns with the *bottom* of the viewport.
      const scrollableHeight = articleHeight - viewportHeight;
      
      // If article is shorter than the viewport, it's fully read once visible
      if (scrollableHeight <= 0) {
        setProgress(100);
        return;
      }

      // How far we have scrolled *within* the article's scrollable area
      const scrolledWithinArticle = scrollY - articleTop;
      
      const currentProgress = (scrolledWithinArticle / scrollableHeight) * 100;
      
      // Clamp the value between 0 and 100 to handle overscrolling
      setProgress(Math.min(Math.max(currentProgress, 0), 100));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Call handler once on mount to set initial progress
    handleScroll();

    // Clean up the event listener on component unmount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1.5 w-full z-50">
        <Progress value={progress} className="h-full rounded-none bg-transparent" />
    </div>
  );
}
