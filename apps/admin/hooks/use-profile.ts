import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  job_title?: string;
  bio?: string;
  avatar?: string;
  password?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const { data: response } = await apiClient.put("/api/profile", data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data.data);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { password: string }) => {
      const { data: response } = await apiClient.put("/api/profile", data);
      return response;
    },
  });
}

export function useDeleteAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete("/api/profile");
    },
    onSuccess: () => {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      queryClient.clear();
      router.push("/login");
    },
  });
}
