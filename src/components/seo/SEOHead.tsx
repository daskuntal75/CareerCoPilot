import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  type?: string;
  noIndex?: boolean;
}

const BASE_URL = "https://tailoredapply.lovable.app";

const SEOHead = ({ title, description, path = "", type = "website", noIndex = false }: SEOHeadProps) => {
  const url = `${BASE_URL}${path}`;
  const fullTitle = title.includes("TailoredApply") ? title : `${title} | TailoredApply`;

  const ogImage = `${BASE_URL}/og-image.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
};

export default SEOHead;
