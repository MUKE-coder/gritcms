export interface MediaAsset {
  id: number;
  tenant_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  url: string;
  thumbnail_url: string;
  alt_text: string;
  folder: string;
  width: number;
  height: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}
