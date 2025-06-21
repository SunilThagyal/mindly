
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/config/site';

export default function TermsAndConditionsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Terms and Conditions for {siteConfig.name}</CardTitle>
           <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
            <h2>1. Agreement to Terms</h2>
            <p>By accessing or using our services, website, and platform ("Service"), you agree to be bound by these Terms and Conditions ("Terms") and our Privacy Policy. If you disagree with any part of the terms, then you do not have permission to access the Service. These Terms apply to all visitors, users, and others who access or use the Service.</p>

            <h2>2. User Accounts</h2>
            <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
            <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>

            <h2>3. User-Generated Content & Conduct</h2>
            <p>Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.</p>
            <p>By posting Content on or through the Service, you represent and warrant that: (i) the Content is yours (you own it) and/or you have the right to use it and the right to grant us the rights and license as provided in these Terms, and (ii) that the posting of your Content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person or entity.</p>
            <p>You retain any and all of your rights to any Content you submit. However, by submitting Content, you grant {siteConfig.name} a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform the Content in connection with the Service and {siteConfig.name}'s (and its successors' and affiliates') business.</p>
            <p>We reserve the right to remove any Content that we determine to be unlawful, fraudulent, threatening, libelous, defamatory, obscene or otherwise objectionable.</p>
            
            <h2>4. Monetization and Earnings</h2>
            <p>{siteConfig.name} offers a feature where users can earn virtual currency based on the views their published content receives. The specific rate of earning per view and the minimum amount required for a withdrawal request are determined by the site administrator and are subject to change.</p>
            <p>Virtual earnings have no cash value until a withdrawal is successfully requested and processed by the administrators. We reserve the right to review all withdrawal requests for compliance with our terms. We may deny requests or adjust earnings if we detect fraudulent activity, including but not limited to, artificially inflated views.</p>
            <p>You are responsible for providing accurate payment information. {siteConfig.name} is not responsible for payments sent to an incorrect account due to user error.</p>
            <p><strong>Processing Time:</strong> Approved withdrawal requests are processed manually and may take up to 3-5 business days to complete.</p>
            <p><strong>Right to Suspend or Terminate Monetization:</strong> {siteConfig.name} reserves the absolute right to suspend or terminate the monetization feature for any individual user or for the entire platform at any time, without prior notice or liability. Reasons for suspension or termination may include, but are not limited to, fraudulent activity, violation of our content policies, or changes in our business model.</p>
            <p><strong>Eligibility for Monetization:</strong> {siteConfig.name} reserves the right to approve or deny any user's eligibility for the monetization program. We may also pause or stop approving new users for the program at our sole discretion.</p>


            <h2>5. Intellectual Property</h2>
            <p>The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of {siteConfig.name} and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of {siteConfig.name}.</p>
            
            <h2>6. Termination</h2>
            <p>We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms. We reserve the right to block accounts, remove content, and prevent access to the service for users who engage in suspicious activity, including but not limited to, artificially inflating view counts, posting prohibited content, or other actions that violate the spirit of these terms.</p>
            
            <h2>7. Disclaimers and Limitation of Liability</h2>
            <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Your use of the Service is at your sole risk. In no event shall {siteConfig.name}, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
            
            <h2>8. Governing Law</h2>
            <p>These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.</p>

            <h2>9. Changes to Terms</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

            <h2>10. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
