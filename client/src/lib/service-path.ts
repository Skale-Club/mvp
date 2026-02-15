export function slugifyServiceName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getServicePath(service: { id: number; name: string }): string {
  const slug = slugifyServiceName(service.name) || `service-${service.id}`;
  return getServicePostPath(service.id, slug);
}

export function getServicePostPath(postId: number, slug?: string): string {
  const safeSlug = slugifyServiceName(slug || "") || `service-${postId}`;
  return `/services/${safeSlug}`;
}
