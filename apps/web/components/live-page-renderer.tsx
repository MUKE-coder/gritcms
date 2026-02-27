"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SectionRenderer, getSection } from "@repo/shared/sections";
import type { PageSection } from "@repo/shared/sections";

/**
 * LivePageRenderer extends the shared PageRenderer by injecting live data
 * from the API into sections that declare a `dataSource` prop.
 *
 * Data sources supported:
 * - "courses"   → GET /api/p/courses
 * - "products"  → GET /api/p/products
 * - "posts"     → GET /api/p/posts
 * - "community" → GET /api/p/community/spaces
 * - "booking"   → GET /api/p/booking/event-types
 * - "newsletter" → injects onSubmit handler (POST /api/email/subscribe)
 */

type DataSourceKey = "courses" | "products" | "posts" | "community" | "booking";

const DATA_SOURCE_ENDPOINTS: Record<DataSourceKey, string> = {
  courses: "/api/p/courses?page=1&page_size=20",
  products: "/api/p/products?page=1&page_size=20",
  posts: "/api/p/posts?page=1&page_size=20",
  community: "/api/p/community/spaces",
  booking: "/api/p/booking/event-types",
};

function getNeededSources(sections: PageSection[]): Set<DataSourceKey> {
  const sources = new Set<DataSourceKey>();
  for (const section of sections) {
    const ds = section.props?.dataSource as string | undefined;
    if (ds && ds in DATA_SOURCE_ENDPOINTS) {
      sources.add(ds as DataSourceKey);
    }
  }
  return sources;
}

function useLiveData(source: DataSourceKey, enabled: boolean) {
  return useQuery({
    queryKey: ["live-data", source],
    queryFn: async () => {
      const { data } = await api.get(DATA_SOURCE_ENDPOINTS[source]);
      return (data.data || []) as Record<string, unknown>[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function LivePageRenderer({ sections }: { sections: PageSection[] }) {
  const needed = React.useMemo(() => getNeededSources(sections), [sections]);

  const coursesQuery = useLiveData("courses", needed.has("courses"));
  const productsQuery = useLiveData("products", needed.has("products"));
  const postsQuery = useLiveData("posts", needed.has("posts"));
  const communityQuery = useLiveData("community", needed.has("community"));
  const bookingQuery = useLiveData("booking", needed.has("booking"));

  const dataMap: Record<DataSourceKey, Record<string, unknown>[]> = {
    courses: coursesQuery.data || [],
    products: productsQuery.data || [],
    posts: postsQuery.data || [],
    community: communityQuery.data || [],
    booking: bookingQuery.data || [],
  };

  const handleNewsletterSubmit = React.useCallback(
    async (email: string, listId?: number) => {
      await api.post("/api/email/subscribe", {
        email,
        list_id: listId || 1,
        source: "website",
      });
    },
    []
  );

  if (!sections || sections.length === 0) {
    return (
      <div className="py-24 text-center text-gray-400">
        <p className="text-lg font-medium">No sections yet</p>
        <p className="text-sm mt-2">Add sections to start building your page</p>
      </div>
    );
  }

  // Filter out header/footer sections — those are handled by layout's Navbar & Footer
  const contentSections = sections.filter((s) => {
    const def = getSection(s.sectionId);
    return def?.category !== "header" && def?.category !== "footer";
  });

  return (
    <>
      {contentSections.map((section) => {
        const ds = section.props?.dataSource as string | undefined;
        const enhancedProps = { ...section.props };

        // Inject live data for sections with a data source
        if (ds && ds in dataMap) {
          enhancedProps._liveData = dataMap[ds as DataSourceKey];
        }

        // Inject newsletter submit handler
        if (ds === "newsletter") {
          const listId = section.props?.listId as number | undefined;
          enhancedProps.onSubmit = async (email: string) => {
            await handleNewsletterSubmit(email, listId);
          };
        }

        return (
          <SectionRenderer
            key={section.id}
            sectionId={section.sectionId}
            props={enhancedProps}
            customClasses={section.customClasses}
          />
        );
      })}
    </>
  );
}
