// Coaching-institute branding for the premium PDF export. All fields are
// overridable via environment variables so the institute name, contacts and
// address can change without code edits. Defaults match the Real Pathshala
// Coaching Institute reference material.

export interface Branding {
  name: string; // primary wordmark, e.g. "REAL PATHSHALA"
  suffix: string; // secondary line, e.g. "COACHING INSTITUTE"
  tagline: string; // italic tagline
  monogram: string; // logo monogram, e.g. "RP"
  phones: string[]; // call / whatsapp numbers
  website: string; // display website
  address: string; // footer address
  footerTagline: string; // rotating strip line at the very bottom
}

function env(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
}

export function getBranding(): Branding {
  return {
    name: env("BRAND_NAME", "REAL PATHSHALA"),
    suffix: env("BRAND_SUFFIX", "COACHING INSTITUTE"),
    tagline: env("BRAND_TAGLINE", "The Home of Practical Education"),
    monogram: env("BRAND_MONOGRAM", "RP"),
    phones: env("BRAND_PHONES", "9977808841, 8269164696")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    website: env("BRAND_WEBSITE", "www.realpathshala.com"),
    address: env(
      "BRAND_ADDRESS",
      "1, White Lotus Plaza, Scheme No. 51, Near Sangam Nagar, Indore (M.P.)",
    ),
    footerTagline: env(
      "BRAND_FOOTER_TAGLINE",
      "Learning made simple, practical and exam-ready.",
    ),
  };
}
