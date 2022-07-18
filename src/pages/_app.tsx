// src/pages/_app.tsx
import { withTRPC } from "@trpc/next";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import { httpLink } from "@trpc/client/links/httpLink";
import { wsLink, createWSClient } from "@trpc/client/links/wsLink";
import type { AppType } from "next/dist/shared/lib/utils";
import type { AppRouter } from "../server/router";
import { splitLink } from "@trpc/client/links/splitLink";
import getConfig from "next/config";
import { preprocess } from "zod";

import superjson from "superjson";
import "../styles/globals.css";

const {
  publicRuntimeConfig: { APP_URL, WS_URL },
} = getConfig();

const MyApp: AppType = ({ Component, pageProps }) => {
  return <Component {...pageProps} />;
};

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }
  if (process.browser) return ""; // Browser should use current path
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url

  // return `http://localhost:${APP_PORT}`; // dev SSR should use localhost
  return `${APP_URL}`; // dev SSR should use localhost
};

const getEndingLink = () => {
  if (typeof window === "undefined") {
    return httpLink({
      url: `${getBaseUrl()}/api/trpc`,
    });
  }
  const client = createWSClient({
    // url: `ws://localhost:${WS_PORT}`,
    url: `${WS_URL}`,
  });
  return wsLink<AppRouter>({
    client,
  });
};

export default withTRPC<AppRouter>({
  config({ ctx }) {
    /**
     * If you want to use SSR, you need to use the server's full URL
     * @link https://trpc.io/docs/ssr
     */
    // const url = `${getBaseUrl()}/api/trpc`;

    return {
      // url: url,
      links: [getEndingLink()],
      transformer: superjson,
      /**
       * @link https://react-query.tanstack.com/reference/QueryClient
       */
      queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
    };
  },
  /**
   * @link https://trpc.io/docs/ssr
   */
  ssr: false,
})(MyApp);
