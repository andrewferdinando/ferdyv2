import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ferdy.io"),
  title: {
    default: "Ferdy — Social Media Automation for Small Businesses",
    template: "%s | Ferdy",
  },
  description:
    "Ferdy automates repeatable social media posts for small businesses. Create, schedule, and publish to Instagram and Facebook — automatically.",
  openGraph: {
    type: "website",
    locale: "en_NZ",
    url: "https://ferdy.io",
    siteName: "Ferdy",
    title: "Ferdy — Social Media Automation for Small Businesses",
    description:
      "Automate your repeatable social media posts. Ferdy creates and publishes the content you repeat every month — so you can focus on the creative work.",
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "Ferdy — Social Media Automation for Small Businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ferdy — Social Media Automation for Small Businesses",
    description:
      "Automate your repeatable social media posts. Designed for restaurants, cafes, e-commerce, and service businesses in Australia and New Zealand.",
    images: ["/images/og-default.png"],
  },
};

// Inline script that runs synchronously BEFORE React hydrates.
// Intercepts Supabase auth hash fragments (tokens or errors) and redirects
// immediately so the user never sees the home page flash.
const AUTH_HASH_REDIRECT_SCRIPT = `
(function(){
  var h=window.location.hash;
  if(!h)return;
  var p=window.location.pathname;
  if(p.indexOf('/auth/')===0)return;

  if(h.indexOf('access_token=')!==-1){
    var params=new URLSearchParams(h.slice(1));
    var type=(params.get('type')||'').toLowerCase();
    var target='/auth/callback';
    if(type==='invite')target='/auth/set-password';
    else if(type==='magiclink')target='/auth/existing-invite';
    var qs='src='+(type||'invite_hash');
    var bid=new URLSearchParams(window.location.search).get('brand_id')||params.get('brand_id');
    if(bid)qs='brand_id='+bid+'&'+qs;
    var email=params.get('email');
    if(email)qs+='&email='+encodeURIComponent(email);
    window.location.replace(target+'?'+qs+'#'+h.slice(1));
  }else if(h.indexOf('error=')!==-1){
    var ep=new URLSearchParams(h.slice(1));
    var desc=ep.get('error_description')||ep.get('error')||'invite_error';
    window.location.replace('/auth/set-password?error='+encodeURIComponent(desc));
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: AUTH_HASH_REDIRECT_SCRIPT }} />
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Ferdy",
              url: "https://ferdy.io",
              logo: "https://ferdy.io/images/ferdy_logo_transparent.png",
              description:
                "Ferdy automates repeatable social media posts for small businesses in Australia and New Zealand.",
              contactPoint: {
                "@type": "ContactPoint",
                email: "support@ferdy.io",
                contactType: "customer support",
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
