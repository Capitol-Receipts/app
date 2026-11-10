import { Html, Head, Main, NextScript } from 'next/document';
import type { DocumentProps } from 'next/document';

/* The search pages set their own language; every other page here is an API route and never uses this. */
export default function Document({ __NEXT_DATA__: data }: DocumentProps) {
  const lang = (data.props as { pageProps?: { m?: { lang?: string } } })?.pageProps?.m?.lang || 'en';
  return (
    <Html lang={lang}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
