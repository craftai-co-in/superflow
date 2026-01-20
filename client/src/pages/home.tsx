import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/header";
import NewHeroSection from "@/components/new-hero-section";
import LostIdeaSection from "@/components/lost-idea-section";
import NewFeaturesSection from "@/components/new-features-section";
import HowItWorksSection from "@/components/how-it-works-section";
import NewPricingSection from "@/components/new-pricing-section";
import FAQSection from "@/components/faq-section";
import NewFooter from "@/components/new-footer";
import SEO from "@/components/seo";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const homeStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://superflow.work/#organization",
        "name": "Superflow",
        "description": "Transform your voice into powerful content with AI-powered transcription and enhancement",
        "url": "https://superflow.work",
        "logo": "https://superflow.work/logo.png",
        "foundingDate": "2025",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+91-80-xxxx-xxxx",
          "contactType": "customer service",
          "email": "support@superflow.work",
          "availableLanguage": ["English", "Hindi"]
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "7th Main Road, Mathikere",
          "addressLocality": "Bengaluru",
          "addressRegion": "Karnataka",
          "postalCode": "560054",
          "addressCountry": "IN"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://superflow.work/#website",
        "url": "https://superflow.work",
        "name": "Superflow",
        "description": "Transform your voice into powerful content with AI",
        "publisher": {
          "@id": "https://superflow.work/#organization"
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://superflow.work/?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        ]
      },
      {
        "@type": "SoftwareApplication",
        "name": "Superflow",
        "description": "AI-powered voice transcription and content enhancement platform for creators, entrepreneurs, and professionals",
        "url": "https://superflow.work",
        "applicationCategory": "Productivity",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR",
          "description": "Free tier with premium upgrades available"
        },
        "featureList": [
          "Voice-to-text transcription",
          "AI content enhancement",
          "Multi-language support",
          "Social media content generation",
          "Recording history management"
        ]
      }
    ]
  };

  return (
    <div className="bg-white">
      <SEO
        title="Superflow - Transform Your Voice Into Powerful Content"
        description="Never lose your next brilliant idea. Transform voice recordings into structured social media content with AI-powered transcription and enhancement. Try free today."
        canonical="https://superflow.work/"
        ogType="website"
        structuredData={homeStructuredData}
      />
      <Header />
      
      {/* Hero Section */}
      <section id="hero">
        <NewHeroSection />
      </section>
      
      {/* Lost Idea Section */}
      <section id="problem">
        <LostIdeaSection />
      </section>
      
      {/* Features Section */}
      <section id="features">
        <NewFeaturesSection />
      </section>
      
      {/* How It Works Section */}
      <section id="how-it-works">
        <HowItWorksSection />
      </section>
      
      {/* Pricing Section */}
      <section id="pricing">
        <NewPricingSection />
      </section>
      
      {/* FAQ Section */}
      <FAQSection />
      
      <NewFooter />
    </div>
  );
}
