import { useEffect } from "react";

const ensureTag = (selector, create) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
};

export default function useMeta({
  title,
  description,
  keywords,
  url,
  image,
  type = "website",
  robots = "index,follow",
  jsonLd,
}) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      const desc = ensureTag('meta[name="description"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        return m;
      });
      desc.setAttribute("content", description);
    }

    if (keywords) {
      const kw = ensureTag('meta[name="keywords"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "keywords");
        return m;
      });
      kw.setAttribute("content", keywords);
    }

    const rb = ensureTag('meta[name="robots"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "robots");
      return m;
    });
    rb.setAttribute("content", robots);

    if (url) {
      const canon = ensureTag('link[rel="canonical"]', () => {
        const l = document.createElement("link");
        l.setAttribute("rel", "canonical");
        return l;
      });
      canon.setAttribute("href", url);
    }

    if (url) {
      const ogUrl = ensureTag('meta[property="og:url"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:url");
        return m;
      });
      ogUrl.setAttribute("content", url);
    }

    const ogType = ensureTag('meta[property="og:type"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:type");
      return m;
    });
    ogType.setAttribute("content", type);

    if (title) {
      const ogTitle = ensureTag('meta[property="og:title"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:title");
        return m;
      });
      ogTitle.setAttribute("content", title);
    }

    const ogSiteName = ensureTag('meta[property="og:site_name"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:site_name");
      return m;
    });
    ogSiteName.setAttribute("content", "Speshway HRMS");

    if (description) {
      const ogDesc = ensureTag('meta[property="og:description"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:description");
        return m;
      });
      ogDesc.setAttribute("content", description);
    }

    if (image) {
      const ogImg = ensureTag('meta[property="og:image"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:image");
        return m;
      });
      ogImg.setAttribute("content", image);
    }

    const twCard = ensureTag('meta[name="twitter:card"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "twitter:card");
      return m;
    });
    twCard.setAttribute("content", image ? "summary_large_image" : "summary");

    if (title) {
      const twTitle = ensureTag('meta[name="twitter:title"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "twitter:title");
        return m;
      });
      twTitle.setAttribute("content", title);
    }

    if (description) {
      const twDesc = ensureTag('meta[name="twitter:description"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "twitter:description");
        return m;
      });
      twDesc.setAttribute("content", description);
    }

    if (image) {
      const twImg = ensureTag('meta[name="twitter:image"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "twitter:image");
        return m;
      });
      twImg.setAttribute("content", image);
    }

    if (url) {
      const twUrl = ensureTag('meta[name="twitter:url"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "twitter:url");
        return m;
      });
      twUrl.setAttribute("content", url);
    }

    if (jsonLd) {
      const ld = ensureTag('script[type="application/ld+json"]', () => {
        const s = document.createElement("script");
        s.setAttribute("type", "application/ld+json");
        return s;
      });
      const payload = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      ld.textContent = JSON.stringify(payload);
    }
  }, [title, description, keywords, url, image, type, robots, jsonLd]);
}
