
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/seo";

export default function Terms() {
  const termsStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Terms of Service - Superflow",
    "description": "Terms of service governing the use of Superflow's AI-powered voice transcription platform.",
    "url": "https://superflow.work/terms",
    "datePublished": "2025-08-29",
    "dateModified": "2025-08-29",
    "author": {
      "@type": "Organization",
      "name": "Superflow"
    },
    "mainEntity": {
      "@type": "Article",
      "headline": "Terms of Service",
      "articleSection": "Legal",
      "keywords": ["terms of service", "user agreement", "platform rules", "service terms"]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Terms of Service - Superflow"
        description="Terms of service governing the use of Superflow's AI-powered voice transcription platform. Learn about user rights, responsibilities, and platform policies."
        canonical="https://superflow.work/terms"
        ogType="article"
        article={{
          publishedTime: "2025-08-29T00:00:00+05:30",
          modifiedTime: "2025-08-29T00:00:00+05:30",
          section: "Legal",
          tags: ["terms of service", "user agreement", "platform rules"]
        }}
        structuredData={termsStructuredData}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600">Effective Date: September 1, 2025 | Last Updated: August 29, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 prose prose-sm max-w-none">
          <h2>1. ACCEPTANCE OF TERMS</h2>
          <p>
            These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Adij Technologies ("we," "us," "our," or "Company") regarding your use of superflow.work ("Service," "Platform," or "Website").
          </p>

          <p><strong>By accessing or using our Service, you agree to:</strong></p>
          <ul>
            <li>Be bound by these Terms and our Privacy Policy</li>
            <li>Comply with all applicable Indian laws and regulations</li>
            <li>Meet the minimum age requirements outlined below</li>
          </ul>

          <p><strong>Business Information:</strong></p>
          <p>Entity: Adij Technologies (Proprietorship - conversion to Private Limited under consideration)</p>

          <h2>2. AGE REQUIREMENTS AND PARENTAL CONSENT</h2>
          <p><strong>By creating an account, you represent and warrant that:</strong></p>
          <ul>
            <li>You are at least 13 years old</li>
            <li>If under 18, you have obtained verifiable parental consent</li>
            <li>Providing false age information may result in account termination</li>
            <li>Parents/guardians are responsible for minor account activity</li>
          </ul>

          <p><strong>Parental Consent Requirements:</strong></p>
          <p>
            Users between 13-17 years must have explicit parental or guardian consent before using our Service. Parents/guardians accept full responsibility for:
          </p>
          <ul>
            <li>Monitoring their minor's use of the Service</li>
            <li>All charges and activities on the minor's account</li>
            <li>Ensuring compliance with these Terms</li>
            <li>Data processing activities related to their minor's account</li>
          </ul>

          <h2>3. SERVICE DESCRIPTION</h2>
          <p>
            Superflow provides AI-powered voice transcription and content enhancement services, including but not limited to:
          </p>
          <ul>
            <li>Voice recording and transcription capabilities</li>
            <li>AI-powered content enhancement and structuring</li>
            <li>Multi-platform content optimization</li>
            <li>User account management and history tracking</li>
          </ul>

          <h2>4. USER RESPONSIBILITIES</h2>
          <p><strong>You agree to:</strong></p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Use the Service only for lawful purposes</li>
            <li>Respect intellectual property rights</li>
            <li>Comply with prohibited content guidelines</li>
          </ul>

          <h2>5. PROHIBITED CONTENT</h2>
          <p><strong>Users cannot upload content that:</strong></p>
          <ul>
            <li>Violates any Indian law</li>
            <li>Contains hate speech or harassment</li>
            <li>Infringes intellectual property rights</li>
            <li>Contains explicit or harmful material</li>
            <li>Impersonates others</li>
            <li>Contains malware or spam</li>
          </ul>

          <h2>6. CONTENT REMOVAL</h2>
          <p><strong>Content moderation procedures:</strong></p>
          <ul>
            <li>Standard content: Removed within 15 days of notification</li>
            <li>Sexual/harmful imagery: Removed within 24 hours</li>
            <li>Appeals process: Submit within 15 days of removal</li>
          </ul>

          <h2>7. PRIVACY AND DATA PROTECTION</h2>
          <p>
            Your privacy is important to us. Our collection, use, and protection of your personal data is governed by our Privacy Policy, which forms part of these Terms. By using our Service, you consent to the data practices described in our Privacy Policy.
          </p>

          <h2>8. INTELLECTUAL PROPERTY</h2>
          <p>
            All content, features, and functionality of the Service are owned by Adij Technologies and are protected by intellectual property laws. You retain ownership of content you create using our Service.
          </p>

          <h2>9. LIMITATION OF LIABILITY</h2>
          <p>
            To the maximum extent permitted by law, Adij Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
          </p>

          <h2>10. GOVERNING LAW</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in India.
          </p>

          <h2>11. CONTACT INFORMATION</h2>
          <p>
            For any questions about these Terms, grievances, or content-related issues, please contact us at:
          </p>
          <p>
            <strong>Adij Technologies</strong><br/>
            7th Main Road, Mathikere, Mathikere Extension<br/>
            Bengaluru (Urban), Karnataka - 560054<br/>
            <strong>Email:</strong> support@superflow.work<br/>
            <em>Note: All grievances are addressed through the same support channel.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
