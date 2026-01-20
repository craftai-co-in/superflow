import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
  structuredData?: object;
}

const defaultImage = 'https://superflow.work/og-image.png';
const siteName = 'Superflow';
const siteUrl = 'https://superflow.work';

export default function SEO({
  title,
  description,
  canonical,
  ogImage = defaultImage,
  ogType = 'website',
  article,
  structuredData
}: SEOProps) {
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const canonicalUrl = canonical || window.location.href;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Update or create link tags
    const updateLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      
      link.setAttribute('href', href);
    };

    // Basic meta tags
    updateMeta('description', description);
    updateMeta('robots', 'index, follow');
    
    // Open Graph tags
    updateMeta('og:title', fullTitle, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', ogType, true);
    updateMeta('og:url', canonicalUrl, true);
    updateMeta('og:image', ogImage, true);
    updateMeta('og:image:alt', `${title} - ${siteName}`, true);
    updateMeta('og:site_name', siteName, true);
    updateMeta('og:locale', 'en_US', true);

    // Twitter Card tags
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', ogImage);
    updateMeta('twitter:site', '@superflow_work');
    updateMeta('twitter:creator', '@superflow_work');

    // Article specific tags
    if (article && ogType === 'article') {
      if (article.publishedTime) updateMeta('article:published_time', article.publishedTime, true);
      if (article.modifiedTime) updateMeta('article:modified_time', article.modifiedTime, true);
      if (article.section) updateMeta('article:section', article.section, true);
      if (article.tags) {
        article.tags.forEach(tag => {
          const meta = document.createElement('meta');
          meta.setAttribute('property', 'article:tag');
          meta.setAttribute('content', tag);
          document.head.appendChild(meta);
        });
      }
    }

    // Canonical URL
    updateLink('canonical', canonicalUrl);

    // Additional useful meta tags
    updateMeta('theme-color', '#2563eb');
    updateMeta('msapplication-TileColor', '#2563eb');
    updateMeta('apple-mobile-web-app-capable', 'yes');
    updateMeta('apple-mobile-web-app-status-bar-style', 'default');

    // Structured data
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      
      script.textContent = JSON.stringify(structuredData);
    }

    // Default organization structured data
    if (!structuredData) {
      const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
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
        },
        "sameAs": [
          "https://twitter.com/superflow_work",
          "https://linkedin.com/company/superflow"
        ]
      };

      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      
      script.textContent = JSON.stringify(organizationSchema);
    }

    // Cleanup function to remove meta tags when component unmounts
    return () => {
      // Keep meta tags for better performance and SEO
      // Only clean up if necessary for specific use cases
    };
  }, [fullTitle, description, canonicalUrl, ogImage, ogType, article, structuredData]);

  return null; // This component doesn't render anything visible
}