
import ContactForm from '@/components/legal/contact-form';
import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Have a question or feedback? Fill out the form to get in touch with us.',
  alternates: {
    canonical: '/contact-us',
  },
  openGraph: {
    title: 'Contact Us',
    description: 'Have a question or feedback? Fill out the form to get in touch with us.',
    url: '/contact-us',
    images: [
      {
        url: `${siteConfig.url}/default-og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Contact Us',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us',
    description: 'Have a question or feedback? Fill out the form to get in touch with us.',
    images: [`${siteConfig.url}/default-og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactUsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-headline font-bold text-foreground">Contact Us</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Have a question or feedback? Fill out the form below.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
