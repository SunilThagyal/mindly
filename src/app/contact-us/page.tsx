import ContactForm from '@/components/legal/contact-form';

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
