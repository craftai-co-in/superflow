
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/seo";

export default function Privacy() {
  const privacyStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Privacy Policy - Superflow",
    "description": "Comprehensive privacy policy outlining how Superflow protects and handles your personal data in compliance with Indian data protection laws.",
    "url": "https://superflow.work/privacy",
    "datePublished": "2025-08-29",
    "dateModified": "2025-08-29",
    "author": {
      "@type": "Organization",
      "name": "Superflow"
    },
    "mainEntity": {
      "@type": "Article",
      "headline": "Privacy Policy",
      "articleSection": "Legal",
      "keywords": ["privacy policy", "data protection", "DPDP Act", "personal data", "Indian privacy laws"]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Privacy Policy - Superflow"
        description="Comprehensive privacy policy outlining how Superflow protects and handles your personal data in compliance with Indian data protection laws including DPDP Act 2023."
        canonical="https://superflow.work/privacy"
        ogType="article"
        article={{
          publishedTime: "2025-08-29T00:00:00+05:30",
          modifiedTime: "2025-08-29T00:00:00+05:30",
          section: "Legal",
          tags: ["privacy policy", "data protection", "DPDP Act", "personal data"]
        }}
        structuredData={privacyStructuredData}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Effective Date: September 1, 2025 | Last Updated: August 29, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 prose prose-sm max-w-none">
          <h2>1. INTRODUCTION</h2>
          <p>
            Adij Technologies ("we," "us," "our," or "Company") operates the website superflow.work ("Service") that provides AI-powered voice-to-text transcription and content creation services. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data in compliance with the Digital Personal Data Protection Act, 2023 ("DPDP Act"), Information Technology Act, 2000 ("IT Act"), and other applicable Indian laws.
          </p>

          <h2>2. INFORMATION WE COLLECT</h2>
          <h3>2.1 Personal Information</h3>
          <p>We collect the following personal information when you register and use our Service:</p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, phone number</li>
            <li><strong>Profile Information:</strong> Professional details, preferences</li>
            <li><strong>Usage Data:</strong> Service interaction data, feature usage patterns</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
          </ul>

          <h3>2.2 Voice and Audio Data</h3>
          <p>Our Service processes voice recordings that you voluntarily submit for transcription and enhancement:</p>
          <ul>
            <li><strong>Voice Recordings:</strong> Audio files up to 30 seconds (Free) or 5 minutes (Premium)</li>
            <li><strong>Transcribed Content:</strong> Text derived from your voice recordings</li>
            <li><strong>Enhanced Content:</strong> AI-processed and structured content based on your input</li>
          </ul>

          <h2>3. HOW WE USE YOUR INFORMATION</h2>
          <p>We process your personal data for the following purposes:</p>
          <ul>
            <li><strong>Service Delivery:</strong> Transcription, content enhancement, and platform functionality</li>
            <li><strong>Account Management:</strong> User registration, authentication, and support</li>
            <li><strong>Communication:</strong> Service updates, support responses, and platform notifications</li>
            <li><strong>Improvement:</strong> Service optimization and feature development</li>
            <li><strong>Compliance:</strong> Legal obligations and regulatory requirements</li>
          </ul>

          <h2>4. THIRD-PARTY SERVICES</h2>
          <h3>4.1 OpenAI Integration</h3>
          <p>
            We use OpenAI's services for voice transcription (Whisper) and content enhancement (GPT models). When you use our Service:
          </p>
          <ul>
            <li>Your voice recordings are sent to OpenAI's servers for processing</li>
            <li>Audio data is processed temporarily and deleted immediately after transcription</li>
            <li>OpenAI's data usage policies apply to this processing</li>
            <li>Data transmission is encrypted using HTTPS protocols</li>
          </ul>

          <h3>4.2 Database and Hosting</h3>
          <p>
            We use secure cloud services for data storage and application hosting. Your data may be processed on servers located outside India for service delivery purposes.
          </p>

          <h2>5. DATA RETENTION AND DELETION</h2>
          <p>We implement the following data retention practices:</p>
          <ul>
            <li><strong>Voice Recordings:</strong> Deleted immediately after transcription processing</li>
            <li><strong>Transcribed Content:</strong> Stored in your account until you delete it</li>
            <li><strong>Account Data:</strong> Retained while your account is active</li>
            <li><strong>Session Data:</strong> Automatically cleared after 7 days of inactivity</li>
          </ul>

          <h2>6. YOUR RIGHTS</h2>
          <p>Under applicable Indian privacy laws, you have the following rights:</p>
          <ul>
            <li><strong>Access:</strong> Request information about your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data</li>
            <li><strong>Portability:</strong> You have the right to download your transcripts</li>
            <li><strong>Withdrawal:</strong> Withdraw consent for data processing</li>
          </ul>

          <h2>7. SECURITY MEASURES</h2>
          <p>We implement appropriate security measures to protect your data:</p>
          <ul>
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication and session management</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and monitoring</li>
          </ul>

          <h2>8. MINORS' PRIVACY</h2>
          <p>
            For users under 18 years of age, we require parental consent before collecting or processing personal data. Parents have the right to:
          </p>
          <ul>
            <li>Review their child's personal information</li>
            <li>Request deletion of their child's data</li>
            <li>Refuse further collection of their child's information</li>
          </ul>

          <h2>9. CROSS-BORDER DATA PROCESSING</h2>
          <p>
            By using our Service, you explicitly consent to:
          </p>
          <ul>
            <li>Transfer of your voice recordings to OpenAI servers (US/EU) for transcription</li>
            <li>Processing by OpenAI Whisper and GPT models outside India</li>
            <li>Immediate deletion of audio files after processing</li>
            <li>Encrypted transmission using HTTPS protocols</li>
          </ul>

          <h2>10. COOKIES AND TRACKING</h2>
          <p>
            We use essential cookies for service functionality and session management. We do not use tracking cookies for advertising purposes.
          </p>

          <h2>11. UPDATES TO THIS POLICY</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes through email or platform notifications.
          </p>

          <h2>12. CONTACT INFORMATION</h2>
          <p>
            For privacy-related questions, grievances, or to exercise your rights, contact us at:
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
