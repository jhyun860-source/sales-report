import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const url = opts.req.url;
  const hasCookie = !!opts.req.headers.cookie;
  const cookieNames = opts.req.headers.cookie
    ? opts.req.headers.cookie.split(';').map(c => c.trim().split('=')[0])
    : [];
  const hasAuthHeader = !!opts.req.headers.authorization;
  
  console.log('[createContext] Request Debug:', {
    url,
    hasCookie,
    cookieNames,
    hasAuthHeader,
  });

  try {
    console.log('[createContext] Attempting sdk.authenticateRequest...');
    user = await sdk.authenticateRequest(opts.req);
    console.log('[createContext] SUCCESS:', {
      userId: user?.id,
      userRole: user?.role,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log('[createContext] FAILED:', { error: errorMsg });
    user = null;
  }

  console.log('[createContext] Final ctx.user:', {
    isNull: user === null,
    userId: user?.id,
    userRole: user?.role,
  });

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
