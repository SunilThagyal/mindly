
import Link from 'next/link';
import { BookText } from 'lucide-react';
import { siteConfig } from '@/config/site';

export default function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <BookText className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-headline font-semibold text-foreground">{siteConfig.name}</h1>
            </Link>
            <p className="text-sm">{siteConfig.description}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 md:col-span-3 gap-8">
            <div>
              <h4 className="font-semibold text-foreground mb-3">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/how-it-works" className="hover:text-primary transition-colors">How it Works</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">Explore</Link></li>
                <li><Link href="/blog/create" className="hover:text-primary transition-colors">Create Post</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact-us" className="hover:text-primary transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-and-conditions" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
