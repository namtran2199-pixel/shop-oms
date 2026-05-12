import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 1;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  healthRateLimit?: Map<string, RateLimitBucket>;
};

function getRateLimitStore() {
  if (!globalForRateLimit.healthRateLimit) {
    globalForRateLimit.healthRateLimit = new Map();
  }

  return globalForRateLimit.healthRateLimit;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "anonymous";
}

function checkRateLimit(request: Request) {
  const now = Date.now();
  const store = getRateLimitStore();
  const key = getClientKey(request);
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    store.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt,
      retryAfter: 0,
    };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - bucket.count,
    resetAt: bucket.resetAt,
    retryAfter: 0,
  };
}

function rateLimitHeaders(limit: ReturnType<typeof checkRateLimit>) {
  return {
    "Retry-After": String(limit.retryAfter),
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
  };
}

export async function GET(request: Request) {
  const limit = checkRateLimit(request);
  const headers = rateLimitHeaders(limit);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
        retryAfter: limit.retryAfter,
      },
      { status: 429, headers },
    );
  }

  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          database: "ok",
        },
        timestamp: new Date().toISOString(),
      },
      { headers },
    );
  } catch (error) {
    console.error("Health check failed", error);

    return NextResponse.json(
      {
        status: "error",
        checks: {
          database: "error",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers },
    );
  }
}
