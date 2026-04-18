import { Helmet } from "react-helmet-async";
import { type SeoMeta, OG_IMAGE, BASE_URL } from "@/lib/seo.data";

interface Props extends SeoMeta {
  breadcrumbs?: { label: string; url?: string }[];
}

export default function SeoHead({ title, description, keywords, canonical, noIndex, breadcrumbs }: Props) {
  const pageUrl = canonical ?? BASE_URL;

  // JSON-LD: BreadcrumbList — для поисковиков и AI-агентов
  const breadcrumbJsonLd = breadcrumbs && breadcrumbs.length > 1
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.label,
          ...(b.url ? { "item": b.url } : {}),
        })),
      })
    : null;

  // JSON-LD: WebPage — даёт AI-агентам понять структуру страницы
  const webPageJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": noIndex ? "WebPage" : "WebPage",
    "name": title,
    "description": description,
    "url": pageUrl,
    "inLanguage": "ru",
    "isPartOf": {
      "@type": "WebSite",
      "name": "СмартМаш",
      "url": BASE_URL,
    },
  });

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords  && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      }

      {/* Open Graph */}
      <meta property="og:title"       content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={OG_IMAGE} />
      <meta property="og:image:width"  content="1024" />
      <meta property="og:image:height" content="1024" />
      <meta property="og:type"        content="website" />
      <meta property="og:url"         content={pageUrl} />
      <meta property="og:locale"      content="ru_RU" />
      <meta property="og:site_name"   content="СмартМаш" />

      {/* Twitter / X */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={OG_IMAGE} />

      {/* JSON-LD: WebPage */}
      <script type="application/ld+json">{webPageJsonLd}</script>

      {/* JSON-LD: BreadcrumbList (если переданы крошки) */}
      {breadcrumbJsonLd && (
        <script type="application/ld+json">{breadcrumbJsonLd}</script>
      )}
    </Helmet>
  );
}
