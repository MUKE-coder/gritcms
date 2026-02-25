export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  tenant_id: number;
  role: "OWNER" | "ADMIN" | "EDITOR" | "USER" | "MEMBER" | "AFFILIATE"; // grit:role-union
  avatar: string;
  job_title: string;
  bio: string;
  active: boolean;
  provider: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}
