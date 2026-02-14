import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { initSupabase } from "@/lib/supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/admin") &&
      window.location.pathname !== "/admin/login"
    ) {
      window.location.href = "/admin/login";
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

let restoringSessionPromise: Promise<boolean> | null = null;

async function tryRestoreServerSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (!restoringSessionPromise) {
    restoringSessionPromise = (async () => {
      try {
        const supabase = await initSupabase();
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return false;

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accessToken }),
        });

        return res.ok;
      } catch {
        return false;
      } finally {
        restoringSessionPromise = null;
      }
    })();
  }

  return restoringSessionPromise;
}

async function fetchWithSessionRecovery(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);
  const requestUrl = typeof input === "string" ? input : input.toString();
  const isInternalApiRequest =
    requestUrl.startsWith("/api/") ||
    (typeof window !== "undefined" && requestUrl.startsWith(window.location.origin + "/api/"));

  if (res.status === 401 && isInternalApiRequest) {
    const restored = await tryRestoreServerSession();
    if (restored) {
      res = await fetch(input, init);
    }
  }

  return res;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetchWithSessionRecovery(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export async function authenticatedRequest(
  method: string,
  url: string,
  token: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetchWithSessionRecovery(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let res = await fetchWithSessionRecovery(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
