import { Session } from "@shopify/shopify-api";
import { SessionStorage } from "@shopify/shopify-app-session-storage";
import { createServiceClient } from "@adltix/database";

/**
 * Custom Supabase-based session storage for Shopify.
 * Uses the Supabase REST API (service_role key) instead of a direct Postgres connection.
 * This avoids needing the raw DB password and works better in serverless environments.
 */
export class SupabaseSessionStorage implements SessionStorage {
  private getClient() {
    return createServiceClient();
  }

  async storeSession(session: Session): Promise<boolean> {
    const supabase = this.getClient();

    const sessionData = {
      id: session.id,
      shop: session.shop,
      state: session.state,
      is_online: session.isOnline,
      scope: session.scope,
      expires: session.expires ? session.expires.toISOString() : null,
      access_token: session.accessToken,
      user_id: session.onlineAccessInfo?.associated_user?.id
        ? Number(session.onlineAccessInfo.associated_user.id)
        : null,
      first_name:
        session.onlineAccessInfo?.associated_user?.first_name || null,
      last_name:
        session.onlineAccessInfo?.associated_user?.last_name || null,
      email: session.onlineAccessInfo?.associated_user?.email || null,
      account_owner:
        session.onlineAccessInfo?.associated_user?.account_owner || false,
      locale: session.onlineAccessInfo?.associated_user?.locale || null,
      collaborator:
        session.onlineAccessInfo?.associated_user?.collaborator || false,
      email_verified:
        session.onlineAccessInfo?.associated_user?.email_verified || false,
    };

    const { error } = await supabase
      .from("shopify_sessions")
      .upsert(sessionData, { onConflict: "id" });

    if (error) {
      console.error("Failed to store session:", error);
      return false;
    }

    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("shopify_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return undefined;
    }

    const session = new Session({
      id: data.id,
      shop: data.shop,
      state: data.state || "",
      isOnline: data.is_online || false,
    });

    session.scope = data.scope || undefined;
    session.expires = data.expires ? new Date(data.expires) : undefined;
    session.accessToken = data.access_token || undefined;

    if (data.user_id) {
      session.onlineAccessInfo = {
        associated_user: {
          id: data.user_id,
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          account_owner: data.account_owner || false,
          locale: data.locale || "",
          collaborator: data.collaborator || false,
          email_verified: data.email_verified || false,
        },
        expires_in: 0,
        associated_user_scope: "",
      } as any;
    }

    return session;
  }

  async deleteSession(id: string): Promise<boolean> {
    const supabase = this.getClient();

    const { error } = await supabase
      .from("shopify_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete session:", error);
      return false;
    }

    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    const supabase = this.getClient();

    const { error } = await supabase
      .from("shopify_sessions")
      .delete()
      .in("id", ids);

    if (error) {
      console.error("Failed to delete sessions:", error);
      return false;
    }

    return true;
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from("shopify_sessions")
      .select("*")
      .eq("shop", shop);

    if (error || !data) {
      return [];
    }

    return data.map((row) => {
      const session = new Session({
        id: row.id,
        shop: row.shop,
        state: row.state || "",
        isOnline: row.is_online || false,
      });

      session.scope = row.scope || undefined;
      session.expires = row.expires ? new Date(row.expires) : undefined;
      session.accessToken = row.access_token || undefined;

      return session;
    });
  }
}
