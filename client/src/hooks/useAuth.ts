import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface LoginData {
  email: string;
  name?: string;
}

interface AuthResponse {
  user: User;
  redirectTo?: string;
  reason?: string;
}

// Custom query function for auth that handles 401 gracefully and cross-domain redirection
const authQueryFn = async (): Promise<AuthResponse | null> => {
  try {
    const res = await fetch("/api/me", { 
      credentials: "include",
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (res.status === 401) {
      return null; // Not authenticated
    }
    
    if (res.status === 503) {
      console.warn("Service temporarily unavailable, using cached data");
      return null; // Service temporarily unavailable
    }
    
    if (!res.ok) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Handle plan expiry notifications
    if (data.planStatus?.wasDowngraded) {
      console.log("User plan was auto-downgraded due to expiry");
      // Could show a toast notification here
    }
    
    // Handle cross-domain redirection with retry logic
    if (data.redirectTo) {
      console.log(`Cross-domain redirect needed: ${data.reason} -> ${data.redirectTo}`);
      
      // Verify the target domain is reachable before redirecting
      try {
        const targetUrl = new URL(data.redirectTo);
        const healthCheck = await fetch(`${targetUrl.origin}/api/health`, { 
          mode: 'no-cors',
          cache: 'no-cache'
        });
        
        // Redirect to target domain
        setTimeout(() => {
          window.location.href = data.redirectTo;
        }, 500);
      } catch (connectError) {
        console.error("Target domain unreachable, staying on current domain:", connectError);
        // Fall back to staying on current domain
      }
    }
    
    return data;
  } catch (error) {
    console.error("Auth check failed:", error);
    
    // Handle network errors gracefully
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn("Network error during auth check, using offline mode");
      return null;
    }
    
    return null;
  }
};

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthResponse | null>({
    queryKey: ["/api/me"],
    queryFn: authQueryFn,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
  });

  return {
    user: data?.user,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loginData: LoginData) => {
      const response = await apiRequest("POST", "/api/auth/login", loginData);
      return response.json();
    },
    onSuccess: (data) => {
      // Handle cross-domain redirection after login
      if (data.redirectTo) {
        console.log(`Login redirect: ${data.reason} -> ${data.redirectTo}`);
        setTimeout(() => {
          window.location.href = data.redirectTo;
        }, 500);
      } else {
        // Invalidate and refetch user data
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["/api/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}