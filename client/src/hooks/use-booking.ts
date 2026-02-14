import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

// --- Categories ---
export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

// --- Services ---
export function useServices(categoryId?: number) {
  return useQuery({
    queryKey: [api.services.list.path, categoryId],
    queryFn: async () => {
      let url = api.services.list.path;
      const params = new URLSearchParams();
      if (categoryId) params.append('categoryId', String(categoryId));
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch services");
      return api.services.list.responses[200].parse(await res.json());
    },
    enabled: true, // Always fetch, even if no category (returns all)
  });
}

