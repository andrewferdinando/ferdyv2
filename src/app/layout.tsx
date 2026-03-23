import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ferdy - Social Media Marketing Automation",
  description: "Create, schedule, and publish social media posts automatically with Ferdy",
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
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
