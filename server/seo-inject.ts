/**
 * Server-side SEO meta tag injection for better crawler support
 */

interface SEOData {
  title: string;
  description: string;
  canonical: string;
  ogType: 'website' | 'article';
  ogImage?: string;
  structuredData?: object;
}

const defaultOGImage = 'https://superflow.work/og-image.png';
const siteName = 'Superflow';

// Route-specific SEO data
const routeSEOData: Record<string, SEOData> = {
  '/': {
    title: 'Superflow - Transform Your Voice Into Powerful Content',
    description: 'Never lose your next brilliant idea. Transform voice recordings into structured social media content with AI-powered transcription and enhancement. Try free today.',
    canonical: 'https://superflow.work/',
    ogType: 'website',
    ogImage: defaultOGImage,
    structuredData: {
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
    }
  },
  '/terms': {
    title: 'Terms of Service - Superflow',
    description: 'Terms of service governing the use of Superflow\'s AI-powered voice transcription platform. Learn about user rights, responsibilities, and platform policies.',
    canonical: 'https://superflow.work/terms',
    ogType: 'article',
    ogImage: defaultOGImage,
    structuredData: {
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
    }
  },
  '/privacy': {
    title: 'Privacy Policy - Superflow',
    description: 'Comprehensive privacy policy outlining how Superflow protects and handles your personal data in compliance with Indian data protection laws including DPDP Act 2023.',
    canonical: 'https://superflow.work/privacy',
    ogType: 'article',
    ogImage: defaultOGImage,
    structuredData: {
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
    }
  }
};

export function generateMetaTags(seoData: SEOData): string {
  const tags = [
    `<title>${seoData.title}</title>`,
    `<meta name="description" content="${seoData.description}" />`,
    `<link rel="canonical" href="${seoData.canonical}" />`,
    
    // Open Graph tags
    `<meta property="og:title" content="${seoData.title}" />`,
    `<meta property="og:description" content="${seoData.description}" />`,
    `<meta property="og:type" content="${seoData.ogType}" />`,
    `<meta property="og:url" content="${seoData.canonical}" />`,
    `<meta property="og:image" content="${seoData.ogImage || defaultOGImage}" />`,
    `<meta property="og:image:alt" content="${seoData.title} - ${siteName}" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:locale" content="en_US" />`,
    
    // Twitter Card tags
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${seoData.title}" />`,
    `<meta name="twitter:description" content="${seoData.description}" />`,
    `<meta name="twitter:image" content="${seoData.ogImage || defaultOGImage}" />`,
    `<meta name="twitter:site" content="@superflow_work" />`,
    `<meta name="twitter:creator" content="@superflow_work" />`,
    
    // Additional meta tags
    `<meta name="robots" content="index, follow" />`,
    `<meta name="theme-color" content="#2563eb" />`,
    `<meta name="msapplication-TileColor" content="#2563eb" />`,
    `<meta name="apple-mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
  ];

  // Add structured data if present
  if (seoData.structuredData) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(seoData.structuredData)}</script>`);
  }

  return tags.join('\n    ');
}

export function injectSEOTags(html: string, url: string): string {
  // Normalize URL path
  const path = new URL(url, 'https://superflow.work').pathname;
  
  // Get SEO data for this route
  const seoData = routeSEOData[path] || routeSEOData['/'];
  
  // Generate meta tags
  const metaTags = generateMetaTags(seoData);
  
  // Replace the base SEO tags in the HTML
  // Look for the comment that indicates where to inject the tags
  const baseMetaRegex = /<!-- Base SEO - will be overridden by page-specific SEO component -->[\s\S]*?(?=<link rel="preconnect")/;
  
  if (baseMetaRegex.test(html)) {
    return html.replace(baseMetaRegex, `<!-- Server-injected SEO tags -->\n    ${metaTags}\n    `);
  }
  
  // Fallback: inject before closing head tag
  return html.replace('</head>', `    <!-- Server-injected SEO tags -->\n    ${metaTags}\n  </head>`);
}

export { routeSEOData };