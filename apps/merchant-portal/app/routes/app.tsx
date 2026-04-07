import { Outlet } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export default function App() {
  return (
    <AppProvider isEmbeddedApp apiKey={window.ENV?.SHOPIFY_API_KEY || ""}>
      <NavMenu>
        <a href="/app" rel="home">Dashboard</a>
        <a href="/app/campaigns">Campaigns</a>
        <a href="/app/influencers">Influencers</a>
        <a href="/app/orders">Orders</a>
        <a href="/app/commissions">Commissions</a>
        <a href="/app/payouts">Payouts</a>
        <a href="/app/settings">Settings</a>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}
