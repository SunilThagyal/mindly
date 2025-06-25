
"use client";

import { Button } from "@/components/ui/button";
import { Facebook, Linkedin, Mail, Link as LinkIcon, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

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
      icon: <FontAwesomeIcon icon={faWhatsapp} className="h-5 w-5" />,
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
