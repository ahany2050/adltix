import "@shopify/shopify-app-react-router/adapters/node";
import {
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { SupabaseSessionStorage } from "./lib/supabase-session-storage";
import { createServiceClient } from "@adltix/database";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  apiVersion: "2025-01",
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new SupabaseSessionStorage(),
  distribution: AppDistribution.AppStore,
  webhooks: {
    ORDERS_CREATE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
    ORDERS_FULFILLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
    ORDERS_CANCELLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
    REFUNDS_CREATE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
    APP_UNINSTALLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      // Register webhooks after OAuth
      shopify.registerWebhooks({ session });

      // Upsert merchant record in database
      const supabase = createServiceClient();
      const { error } = await supabase.from("merchants").upsert(
        {
          shopify_domain: session.shop,
          shopify_access_token: session.accessToken!,
          shopify_shop_id: session.shop.replace(".myshopify.com", ""),
          name: session.shop,
          email: "",
          is_active: true,
        },
        { onConflict: "shopify_domain" }
      );

      if (error) {
        console.error("Failed to upsert merchant:", error);
      }
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: false,
  },
});

export default shopify;
export const apiVersion = shopify.apiVersion;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
