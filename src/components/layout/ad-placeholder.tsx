
import { cn } from '@/lib/utils';

interface AdPlaceholderProps {
  type: 'leaderboard-header' | 'in-content' | 'sidebar' | 'below-content' | 'mobile-sticky-footer';
  className?: string;
}

const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ type, className }) => {
  let text = "Ad Placeholder";
  let specificClass = "";

  switch (type) {
    case 'leaderboard-header':
      text = "Ad: Leaderboard (728x90 Desktop / 320x50 Mobile)";
      specificClass = "ad-placeholder-leaderboard-header";
      break;
    case 'in-content':
      text = "Ad: In-Content (300x250 or 336x280)";
      specificClass = "ad-placeholder-incontent";
      break;
    case 'sidebar':
      text = "Ad: Sidebar (300x600)";
      specificClass = "ad-placeholder-sidebar";
      break;
    case 'below-content':
      text = "Ad: Below Content (728x90 or 300x250)";
      specificClass = "ad-placeholder-below-content";
      break;
    case 'mobile-sticky-footer':
        text = "Ad: Mobile Sticky (320x50)";
        specificClass = "h-12"; // Height for sticky footer
        // This one will be absolutely positioned typically, handle in layout.tsx
        return (
             <div className={cn("sm:hidden fixed bottom-0 left-0 right-0 h-12 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center z-50 border-t border-border", className)}>
                <span className="text-xs text-muted-foreground">{text}</span>
            </div>
        )
  }

  return (
    <div className={cn('ad-placeholder', specificClass, className)}>
      <span className="text-xs p-2">{text}</span>
    </div>
  );
};

export default AdPlaceholder;
