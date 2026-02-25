import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { apiClient } from "@/lib/api-client";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar: string;
  job_title: string;
  bio: string;
  active: boolean;
}

interface AuthResponse {
  data: {
    user: User;
    tokens: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };
  };
}

function storeTokens(tokens: { access_token: string; refresh_token: string }) {
  Cookies.set("access_token", tokens.access_token, { expires: 1 });
  Cookies.set("refresh_token", tokens.refresh_token, { expires: 7 });
}

function clearTokens() {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
}

export function useMe() {
  return useQuery<User>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/auth/me");
      return data.data;
    },
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await apiClient.post<AuthResponse>(
        "/api/auth/login",
        credentials
      );
      return data;
    },
    onSuccess: (data) => {
      storeTokens(data.data.tokens);
      queryClient.setQueryData(["me"], data.data.user);
      router.push(data.data.user.role === "USER" ? "/profile" : "/dashboard");
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
    }) => {
      const { data: response } = await apiClient.post<AuthResponse>(
        "/api/auth/register",
        data
      );
      return response;
    },
    onSuccess: (data) => {
      storeTokens(data.data.tokens);
      queryClient.setQueryData(["me"], data.data.user);
      router.push(data.data.user.role === "USER" ? "/profile" : "/dashboard");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post("/api/auth/logout");
      } catch {
        // Ignore
      }
    },
    onSettled: () => {
      clearTokens();
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    },
  });
}
