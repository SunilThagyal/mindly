
"use client";

import { Button } from "@/components/ui/button";
import { Facebook, Linkedin, Mail, Link as LinkIcon, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// A simple inline SVG component for the WhatsApp icon
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M17.472 14.382c-.297-.149-.758-.372-1.09-.498-.333-.124-.57-.187-.81-.187-.24 0-.48.062-.676.187-.196.124-.392.249-.602.498-.21.25-.42.498-.63.748-.21.25-.42.498-.63.748-.21.25-.42.498-.63.748s-.42.498-.63.748c-.21.25-.42.498-.63.748s-.42.498-.63.748c-.21.25-.42.498-.63.748s-.42.498-.63.748c-.21.25-.42.498-.63.748s-.42.498-.63.748c-.21.25-.42.498-.63.748s-.42.498-.63.748c-.21.25-.42.498-.63.748s-.42.498-.63.748c-.21.25-.42.498-.63.748s-.42.498-.63.748c-.229.273-.509.51-.83.729-.319.218-.69.418-1.108.592-.418.173-.88.318-1.375.438-.495.12-1.01.196-1.536.196-2.137 0-4.146-.723-5.885-2.15-1.738-1.428-2.94-3.354-3.51-5.633-.57-2.278-.495-4.63.229-6.843.723-2.212 1.938-4.103 3.51-5.633 1.57-1.53 3.496-2.734 5.633-3.305 2.137-.57 4.38-.495 6.512.229 2.133.723 3.99 1.938 5.416 3.51 1.428 1.57 2.486 3.496 3.057 5.633.57 2.137.495 4.38-.229 6.512-.723 2.133-1.938 3.99-3.51 5.416-1.572 1.428-3.496 2.486-5.634 3.057z"/>
    </svg>
);

interface SocialShareButtonsProps {
  blogUrl: string;
  blogTitle: string;
}

export default function SocialShareButtons({ blogUrl, blogTitle }: SocialShareButtonsProps) {
  const { toast } = useToast();
  const [canShare, setCanShare] = useState(false);
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${blogUrl}` : blogUrl;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl)
      .then(() => {
        toast({ title: "Link Copied!", description: "Blog post URL copied to clipboard.", variant: 'success' });
      })
      .catch(err => {
        console.error("Failed to copy link: ", err);
        toast({ title: "Error", description: "Failed to copy link.", variant: "destructive" });
      });
  };

  const handleWebShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: blogTitle,
                text: `Check out this blog post: "${blogTitle}"`,
                url: fullUrl,
            });
        } catch (error) {
            console.error('Error using Web Share API:', error);
            // This error typically happens if the user cancels the share dialog, so we don't need to show a toast.
        }
    } else {
        toast({ title: "Not Supported", description: "Web Share is not supported by your browser.", variant: 'destructive' });
    }
  };

  const shareOptions = [
    {
      name: "Facebook",
      icon: <Facebook className="h-5 w-5" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
    },
    {
      name: "WhatsApp",
      icon: <WhatsAppIcon className="h-5 w-5" />,
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(blogTitle + " " + fullUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="h-5 w-5" />,
      url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(blogTitle)}`,
    },
    {
      name: "Email",
      icon: <Mail className="h-5 w-5" />,
      url: `mailto:?subject=${encodeURIComponent(blogTitle)}&body=Check out this blog post: ${encodeURIComponent(fullUrl)}`,
    },
  ];

  return (
    <div className="mt-8 pt-6 border-t">
      <h3 className="text-lg font-semibold mb-3 text-foreground">Share this post:</h3>
      <div className="flex flex-wrap gap-2">
        {shareOptions.map(option => (
          <Button
            key={option.name}
            variant="outline"
            size="icon"
            asChild
            title={`Share on ${option.name}`}
            className="rounded-full"
          >
            <a href={option.url} target="_blank" rel="noopener noreferrer">
              {option.icon}
            </a>
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          onClick={copyLink}
          title="Copy link"
          className="rounded-full"
        >
          <LinkIcon className="h-5 w-5" />
        </Button>
        {canShare && (
             <Button
                variant="outline"
                size="icon"
                onClick={handleWebShare}
                title="More options"
                className="rounded-full"
            >
                <MoreHorizontal className="h-5 w-5" />
            </Button>
        )}
      </div>
    </div>
  );
}
