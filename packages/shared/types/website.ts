// --- Content Block Types ---

export type BlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "video"
  | "code"
  | "quote"
  | "list"
  | "divider"
  | "button"
  | "embed"
  | "columns"
  | "cta"
  | "faq"
  | "testimonial";

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  data: {
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    alignment?: "left" | "center" | "right";
  };
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  data: {
    text: string; // HTML rich text (bold, italic, links)
    alignment?: "left" | "center" | "right";
  };
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  data: {
    url: string;
    alt: string;
    caption?: string;
    alignment?: "left" | "center" | "right" | "full";
    width?: number;
    height?: number;
  };
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  data: {
    url: string; // YouTube or Vimeo URL
    caption?: string;
  };
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  data: {
    code: string;
    language?: string;
  };
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  data: {
    text: string;
    attribution?: string;
  };
}

export interface ListBlock extends BaseBlock {
  type: "list";
  data: {
    style: "ordered" | "unordered";
    items: string[];
  };
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
  data: Record<string, never>;
}

export interface ButtonBlock extends BaseBlock {
  type: "button";
  data: {
    text: string;
    url: string;
    style?: "primary" | "secondary" | "outline";
    alignment?: "left" | "center" | "right";
    openInNewTab?: boolean;
  };
}

export interface EmbedBlock extends BaseBlock {
  type: "embed";
  data: {
    html: string; // Arbitrary HTML/iframe
    caption?: string;
  };
}

export interface ColumnsBlock extends BaseBlock {
  type: "columns";
  data: {
    columns: ContentBlock[][]; // 2-3 columns, each with nested blocks
  };
}

export interface CTABlock extends BaseBlock {
  type: "cta";
  data: {
    heading: string;
    text: string;
    buttonText: string;
    buttonUrl: string;
    style?: "default" | "highlight" | "minimal";
  };
}

export interface FAQBlock extends BaseBlock {
  type: "faq";
  data: {
    items: { question: string; answer: string }[];
  };
}

export interface TestimonialBlock extends BaseBlock {
  type: "testimonial";
  data: {
    quote: string;
    name: string;
    role?: string;
    avatar?: string;
  };
}

export type ContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | VideoBlock
  | CodeBlock
  | QuoteBlock
  | ListBlock
  | DividerBlock
  | ButtonBlock
  | EmbedBlock
  | ColumnsBlock
  | CTABlock
  | FAQBlock
  | TestimonialBlock;

// --- Page ---

export interface Page {
  id: number;
  tenant_id: number;
  title: string;
  slug: string;
  content: ContentBlock[] | null;
  excerpt: string;
  status: "draft" | "published" | "archived";
  template: string;
  meta_title: string;
  meta_description: string;
  og_image: string;
  sort_order: number;
  parent_id: number | null;
  author_id: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: { id: number; first_name: string; last_name: string; avatar: string };
  children?: Page[];
}

// --- Post ---

export interface Post {
  id: number;
  tenant_id: number;
  title: string;
  slug: string;
  content: ContentBlock[] | null;
  excerpt: string;
  featured_image: string;
  status: "draft" | "published" | "archived";
  meta_title: string;
  meta_description: string;
  og_image: string;
  author_id: number;
  reading_time: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: { id: number; first_name: string; last_name: string; avatar: string };
  categories?: PostCategory[];
  tags?: PostTag[];
}

// --- Post Category ---

export interface PostCategory {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: PostCategory[];
}

// --- Post Tag ---

export interface PostTag {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

// --- Menu ---

export interface Menu {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  location: "header" | "footer" | "sidebar";
  created_at: string;
  updated_at: string;
  items?: MenuItem[];
}

export interface MenuItem {
  id: number;
  tenant_id: number;
  menu_id: number;
  label: string;
  url: string;
  page_id: number | null;
  target: "_self" | "_blank";
  sort_order: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  page?: { id: number; title: string; slug: string };
  children?: MenuItem[];
}
