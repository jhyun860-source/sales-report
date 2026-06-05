import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }

  private decodeState(state: string): string {
    const redirectUri = atob(state);
    return redirectUri;
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      console.log('[Auth] Verifying token:', { tokenLength: cookieValue.length, tokenStart: cookieValue.substring(0, 50) });
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      console.log('[Auth] JWT verified, payload:', payload);
      
      // Check if this is a Store Account token (has 'type: store')
      const tokenType = (payload as Record<string, unknown>).type;
      if (tokenType === 'store') {
        console.log('[Auth] Store Account token detected');
        // For Store Account tokens, we need to convert to Manus user format
        // Use accountId as openId, and create synthetic appId/name
        const accountId = (payload as Record<string, unknown>).accountId;
        const loginId = (payload as Record<string, unknown>).loginId;
        if (typeof accountId === 'number' && typeof loginId === 'string') {
          return {
            openId: String(accountId),
            appId: 'store-account',
            name: loginId,
          };
        }
      }
      
      // Otherwise, expect Manus OAuth token format
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields", { openId, appId, name });
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  async authenticateRequest(req: Request): Promise<User> {
    // Try Authorization header first (for mobile Chrome cookie blocking), then fall back to cookie
    let sessionCookie: string | undefined;
    
    // Log incoming request details
    console.log('[Auth] Request received:', {
      authHeaderExists: !!req.headers.authorization,
      authHeaderValue: req.headers.authorization ? req.headers.authorization.substring(0, 100) : 'NOT SET',
      cookieExists: !!req.headers.cookie,
      url: (req as any).url
    });
    
    // Check Authorization header first
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      console.log('[Auth] Authorization header found:', { headerStart: authHeader.substring(0, 50) });
      if (authHeader.startsWith('Bearer ')) {
        sessionCookie = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('[Auth] ✅ Using token from Authorization header', { tokenLength: sessionCookie.length, tokenStart: sessionCookie.substring(0, 100) });
      } else {
        console.log('[Auth] ❌ Authorization header does NOT start with Bearer:', { header: authHeader.substring(0, 50) });
      }
    } else {
      console.log('[Auth] ❌ NO Authorization header found');
    }
    
    // Fall back to cookie if no Authorization header
    if (!sessionCookie) {
      const cookies = this.parseCookies(req.headers.cookie);
      sessionCookie = cookies.get(COOKIE_NAME);
      if (sessionCookie) {
        console.log('[Auth] Using token from session cookie');
      }
    }
    
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // If this is a Store Account token (appId === 'store-account'), handle differently
    if (session.appId === 'store-account') {
      console.log('[Auth] Store Account authentication, creating synthetic user');
      // For Store Account, fetch the account details and update user role
      const storeAccount = await db.getStoreAccountById(parseInt(sessionUserId, 10));
      console.log('[Auth] Store Account fetched:', { id: storeAccount?.id, loginId: storeAccount?.loginId, role: storeAccount?.role });
      if (!storeAccount) {
        throw ForbiddenError("Store account not found");
      }
      const finalRole = (storeAccount.role as 'admin' | 'user') || 'user';
      console.log('[Auth] Store Account role:', finalRole);
      
      if (!user) {
        // Create a synthetic user for Store Account
        user = {
          id: parseInt(sessionUserId, 10),
          openId: sessionUserId,
          name: storeAccount.displayName || storeAccount.loginId,
          email: null,
          role: finalRole,
          loginMethod: 'store-account',
          lastSignedIn: signedInAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any as User;
      } else {
        // User exists in DB, but update role from Store Account
        user.role = finalRole;
        user.name = storeAccount.displayName || storeAccount.loginId;
      }
    } else {
      // If user not in DB, sync from OAuth server automatically
      if (!user) {
        try {
          const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
          await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: signedInAt,
          });
          user = await db.getUserByOpenId(userInfo.openId);
        } catch (error) {
          console.error("[Auth] Failed to sync user from OAuth:", error);
          throw ForbiddenError("Failed to sync user info");
        }
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServer();
