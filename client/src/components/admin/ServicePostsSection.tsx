import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Category, Service, ServicePost } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Image, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { getServicePostPath } from "@/lib/service-path";

type ServicePostFormValues = {
  title: string;
  slug: string;
  status: string;
  excerpt: string;
  content: string;
  metaDescription: string;
  focusKeyword: string;
  featureImageUrl: string;
};

type CreateServiceFormValues = {
  name: string;
  slug: string;
  focusKeyword: string;
  content: string;
  metaDescription: string;
  featureImageUrl: string;
  status: "draft" | "published";
};

const CREATE_INITIAL_VALUES: CreateServiceFormValues = {
  name: "",
  slug: "",
  focusKeyword: "",
  content: "",
  metaDescription: "",
  featureImageUrl: "",
  status: "published",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const raw = await res.text();

  if (!res.ok) {
    throw new Error(raw || fallbackMessage);
  }

  if (!contentType.includes("application/json")) {
    if (raw.trim().startsWith("<")) {
      throw new Error("Authentication required. Please sign in again.");
    }
    throw new Error(fallbackMessage);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(fallbackMessage);
  }
}

async function uploadFileToServer(file: File): Promise<string> {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ filename: file.name, data: base64Data }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Upload failed");
  }

  const { path } = await res.json();
  return path;
}

export function ServicePostsSection() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingPost, setEditingPost] = useState<ServicePost | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [createForm, setCreateForm] = useState<CreateServiceFormValues>(CREATE_INITIAL_VALUES);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastContentRef = useRef("");

  const [formValues, setFormValues] = useState<ServicePostFormValues>({
    title: "",
    slug: "",
    status: "published",
    excerpt: "",
    content: "",
    metaDescription: "",
    focusKeyword: "",
    featureImageUrl: "",
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services", { includeHidden: true }],
    queryFn: () => fetch("/api/services?includeHidden=true").then((res) => res.json()),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: posts, isLoading } = useQuery<ServicePost[]>({
    queryKey: ["/api/service-posts", "admin"],
    queryFn: () => fetch("/api/service-posts").then((res) => res.json()),
  });

  const serviceById = useMemo(() => new Map((services || []).map((service) => [service.id, service])), [services]);

  const resetCreateState = useCallback(() => {
    setCreateForm(CREATE_INITIAL_VALUES);
    setIsEditorExpanded(false);
    if (contentRef.current) {
      contentRef.current.innerHTML = "";
    }
    lastContentRef.current = "";
  }, []);

  const rows = useMemo(() => {
    const lower = search.toLowerCase();
    return (posts || []).filter((post) => {
      const service = serviceById.get(post.serviceId);
      const serviceName = service?.name || "";
      return (
        post.title.toLowerCase().includes(lower) ||
        post.slug.toLowerCase().includes(lower) ||
        serviceName.toLowerCase().includes(lower)
      );
    });
  }, [posts, serviceById, search]);

  const syncEditorContent = useCallback(() => {
    if (!contentRef.current) return;
    const rawHtml = contentRef.current.innerHTML;
    const text = contentRef.current.textContent?.trim() || "";
    const nextHtml = text ? rawHtml : "";
    lastContentRef.current = nextHtml;
    setCreateForm((prev) => (prev.content === nextHtml ? prev : { ...prev, content: nextHtml }));
  }, []);

  const runEditorCommand = useCallback(
    (command: string, value?: string) => {
      if (!contentRef.current) return;
      contentRef.current.focus();
      document.execCommand(command, false, value);
      syncEditorContent();
    },
    [syncEditorContent]
  );

  const setEditorBlock = useCallback(
    (tag: "p" | "h2") => {
      runEditorCommand("formatBlock", `<${tag}>`);
    },
    [runEditorCommand]
  );

  const insertEditorLink = useCallback(() => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runEditorCommand("createLink", url);
  }, [runEditorCommand]);

  useEffect(() => {
    if (!isCreateOpen || !contentRef.current) return;
    if (createForm.content === lastContentRef.current) return;
    if (document.activeElement === contentRef.current) return;
    contentRef.current.innerHTML = createForm.content;
    lastContentRef.current = createForm.content;
  }, [createForm.content, isCreateOpen]);

  const updatePost = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: ServicePostFormValues }) => {
      const payload = {
        title: values.title.trim(),
        slug: values.slug.trim(),
        status: values.status,
        excerpt: values.excerpt.trim() || null,
        content: values.content,
        metaDescription: values.metaDescription.trim() || null,
        focusKeyword: values.focusKeyword.trim() || null,
        featureImageUrl: values.featureImageUrl.trim() || null,
        publishedAt: values.status === "published" ? new Date().toISOString() : null,
      };
      const res = await apiRequest("PUT", `/api/service-posts/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-posts"] });
      toast({ title: "Service page updated" });
      setEditingPost(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update service page", description: error.message, variant: "destructive" });
    },
  });

  const createServiceWithPage = useMutation({
    mutationFn: async (values: CreateServiceFormValues) => {
      const cleanName = values.name.trim();
      const cleanSlug = slugify(values.slug || cleanName);
      const cleanContent = values.content.trim();
      const plainContent = stripHtml(cleanContent);
      const excerpt = values.metaDescription.trim() || plainContent.slice(0, 220) || cleanName;
      let availableCategories = categories || [];
      if (!availableCategories.length) {
        const categoriesRes = await fetch("/api/categories", { credentials: "include" });
        availableCategories = await parseJsonOrThrow<Category[]>(categoriesRes, "Failed to load categories.");
      }

      let defaultCategoryId = availableCategories?.[0]?.id;
      if (!defaultCategoryId) {
        try {
          const fallbackCategoryName = "General";
          const fallbackCategorySlug = "general";
          const createdCategoryRes = await apiRequest("POST", "/api/categories", {
            name: fallbackCategoryName,
            slug: fallbackCategorySlug,
            description: "Default category for service pages",
            order: 0,
          });
          const createdCategory = await parseJsonOrThrow<Category>(createdCategoryRes, "Failed to create default category.");
          defaultCategoryId = createdCategory.id;
        } catch {
          // If category already exists or creation fails due a race, try loading categories again.
          const categoriesRes = await fetch("/api/categories", { credentials: "include" });
          availableCategories = await parseJsonOrThrow<Category[]>(categoriesRes, "Failed to reload categories.");
          defaultCategoryId = availableCategories?.[0]?.id;
        }
      }

      if (!defaultCategoryId) {
        throw new Error("Unable to resolve a category for this service.");
      }

      const serviceRes = await apiRequest("POST", "/api/services", {
        name: cleanName,
        categoryId: defaultCategoryId,
        description: excerpt,
        price: "0.00",
        durationMinutes: 60,
        imageUrl: values.featureImageUrl.trim() || null,
      });
      const service = await parseJsonOrThrow<Service>(serviceRes, "Failed to create service.");

      const postRes = await fetch(`/api/services/${service.id}/post`, { credentials: "include" });
      if (!postRes.ok) {
        throw new Error("Failed to load the generated service page");
      }
      const { post } = await parseJsonOrThrow<{ post: ServicePost }>(postRes, "Failed to parse generated service page.");

      await apiRequest("PUT", `/api/service-posts/${post.id}`, {
        title: cleanName,
        slug: cleanSlug,
        status: values.status,
        content: cleanContent,
        excerpt,
        metaDescription: values.metaDescription.trim() || excerpt,
        focusKeyword: values.focusKeyword.trim() || cleanName,
        featureImageUrl: values.featureImageUrl.trim() || null,
        publishedAt: values.status === "published" ? new Date().toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Service created successfully" });
      setIsCreateOpen(false);
      resetCreateState();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create service", description: error.message, variant: "destructive" });
    },
  });

  const openEditor = (post: ServicePost) => {
    setEditingPost(post);
    setFormValues({
      title: post.title || "",
      slug: post.slug || "",
      status: post.status || "draft",
      excerpt: post.excerpt || "",
      content: post.content || "",
      metaDescription: post.metaDescription || "",
      focusKeyword: post.focusKeyword || "",
      featureImageUrl: post.featureImageUrl || "",
    });
  };

  const handleCreateImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imagePath = await uploadFileToServer(file);
      setCreateForm((prev) => ({ ...prev, featureImageUrl: imagePath }));
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  };

  const createFocusScore = useMemo(() => {
    const keyword = createForm.focusKeyword.toLowerCase().trim();
    if (!keyword) return null;

    const title = createForm.name.toLowerCase();
    const slug = createForm.slug.toLowerCase();
    const content = createForm.content.toLowerCase();
    const metaDesc = createForm.metaDescription.toLowerCase();

    let score = 0;
    if (title.includes(keyword)) score += 25;
    if (slug.includes(keyword.replace(/\s+/g, "-"))) score += 15;
    if (metaDesc.includes(keyword)) score += 25;

    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;
    const keywordRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const keywordCount = (content.match(keywordRegex) || []).length;
    const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

    if (keywordCount >= 1) score += 10;
    if (keywordCount >= 3) score += 10;
    if (density >= 0.5 && density <= 2.5) score += 15;

    const barColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
    const badgeClass =
      score >= 80
        ? "bg-green-500/15 text-green-600 dark:text-green-400"
        : score >= 50
        ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
        : "bg-red-500/15 text-red-600 dark:text-red-400";

    return { score, barColor, badgeClass };
  }, [createForm.focusKeyword, createForm.name, createForm.slug, createForm.content, createForm.metaDescription]);

  const closeCreateScreen = () => {
    setIsCreateOpen(false);
    resetCreateState();
  };

  const renderCreateServiceForm = () => (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const editorHtml = contentRef.current?.innerHTML || createForm.content;
        const editorText = (contentRef.current?.textContent || stripHtml(editorHtml)).trim();
        const normalizedContent = editorText ? editorHtml : "";

        if (!normalizedContent.trim()) {
          toast({ title: "Content is required", variant: "destructive" });
          return;
        }
        if (normalizedContent !== createForm.content) {
          setCreateForm((prev) => ({ ...prev, content: normalizedContent }));
        }

        createServiceWithPage.mutate({
          ...createForm,
          content: normalizedContent,
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="service-create-title">Title *</Label>
          <Input
            id="service-create-title"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((prev) => ({
                ...prev,
                name: e.target.value,
                slug: prev.slug || slugify(e.target.value),
              }))
            }
            placeholder="Enter service title"
            className="border-0 bg-background"
            required
            data-testid="input-service-create-title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="service-create-slug">Slug *</Label>
          <Input
            id="service-create-slug"
            value={createForm.slug}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
            placeholder="url-friendly-slug"
            className="border-0 bg-background"
            required
            data-testid="input-service-create-slug"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="service-create-keyword">Focus Keyword</Label>
          <div className="overflow-hidden rounded-md bg-background">
            <div className="relative">
              <Input
                id="service-create-keyword"
                value={createForm.focusKeyword}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, focusKeyword: e.target.value }))}
                placeholder="Primary SEO keyword"
                className="rounded-none border-0 bg-transparent pr-14"
                data-testid="input-service-create-keyword"
              />
              {createFocusScore ? (
                <span
                  className={clsx(
                    "absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    createFocusScore.badgeClass
                  )}
                >
                  {createFocusScore.score}/100
                </span>
              ) : null}
            </div>
            {createFocusScore ? (
              <div className="h-[3px] bg-slate-200 dark:bg-slate-700">
                <div className={clsx("h-full transition-all", createFocusScore.barColor)} style={{ width: `${createFocusScore.score}%` }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-create-content">Content *</Label>
        <div className="overflow-hidden rounded-md bg-background">
          <div className="flex flex-wrap items-center gap-1 border-b border-border/50 px-2 py-2 text-xs text-muted-foreground">
            <button type="button" onClick={() => setEditorBlock("p")} className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">P</button>
            <button type="button" onClick={() => setEditorBlock("h2")} className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">H2</button>
            <span className="mx-1 h-4 w-px bg-border/60" />
            <button type="button" onClick={() => runEditorCommand("bold")} className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">B</button>
            <button type="button" onClick={() => runEditorCommand("italic")} className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">I</button>
            <button type="button" onClick={() => runEditorCommand("insertUnorderedList")} className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">UL</button>
            <button type="button" onClick={() => runEditorCommand("insertOrderedList")} className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">OL</button>
            <button type="button" onClick={insertEditorLink} className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">Link</button>
            <button type="button" onClick={() => runEditorCommand("removeFormat")} className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">Clear</button>
            <button
              type="button"
              onClick={() => setIsEditorExpanded((prev) => !prev)}
              className="ml-auto rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted"
            >
              {isEditorExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
          <div
            id="service-create-content"
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onInput={syncEditorContent}
            onBlur={syncEditorContent}
            data-placeholder="Write your service page content here..."
            className={clsx(
              "admin-editor prose prose-sm max-w-none overflow-y-auto px-3 py-2 text-sm focus:outline-none dark:prose-invert",
              isEditorExpanded
                ? "min-h-[320px] max-h-[65vh] sm:min-h-[420px] sm:max-h-[70vh]"
                : "min-h-[180px] max-h-[40vh] sm:min-h-[220px] sm:max-h-[45vh]"
            )}
            data-testid="textarea-service-create-content"
          />
        </div>
        <p className="text-xs text-muted-foreground">Supports HTML formatting</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="service-create-meta">Meta Description</Label>
          <Textarea
            id="service-create-meta"
            value={createForm.metaDescription}
            onChange={(e) =>
              setCreateForm((prev) => ({
                ...prev,
                metaDescription: e.target.value.slice(0, 155),
              }))
            }
            placeholder="Short description for SEO and service cards..."
            className="min-h-[100px] border-0 bg-background"
            data-testid="textarea-service-create-meta"
          />
          <p className="text-xs text-muted-foreground">{createForm.metaDescription.length}/155 characters · Used for SEO and service cards</p>
        </div>
        <div className="space-y-2">
          <Label>Feature Image</Label>
          <div
            className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50 sm:w-1/2"
            onClick={() => document.getElementById("serviceCreateFeatureImageInput")?.click()}
          >
            {createForm.featureImageUrl ? (
              <>
                <img src={createForm.featureImageUrl} alt="Feature" className="h-full w-full object-cover" data-testid="img-service-create-feature-preview" />
                <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">Uploaded</div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-sm font-medium text-white">Click to change</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateForm((prev) => ({ ...prev, featureImageUrl: "" }));
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground transition-colors group-hover:text-primary">
                <Image className="mb-2 h-8 w-8" />
                <span className="text-sm">Click to upload</span>
                <span className="mt-1 text-xs">1200x675px (16:9)</span>
              </div>
            )}
            <input
              id="serviceCreateFeatureImageInput"
              type="file"
              accept="image/*"
              onChange={handleCreateImageUpload}
              className="hidden"
              data-testid="input-service-create-feature-image"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={createForm.status}
            onValueChange={(value: "draft" | "published") => setCreateForm((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="border-0 bg-background" data-testid="select-service-create-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={closeCreateScreen}
          data-testid="button-service-create-back-bottom"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Services
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={closeCreateScreen}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              createServiceWithPage.isPending ||
              !createForm.name.trim() ||
              !createForm.slug.trim()
            }
            data-testid="button-service-create-submit"
          >
            {createServiceWithPage.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Service
          </Button>
        </div>
      </div>
    </form>
  );

  if (isCreateOpen) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeCreateScreen}
              data-testid="button-service-create-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Button>
            <h1 className="text-2xl font-bold">Create New Service</h1>
          </div>
        </div>
        <div className="space-y-6 rounded-lg bg-muted p-4 transition-all sm:p-6">{renderCreateServiceForm()}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage service pages and SEO content.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-service">
          <Plus className="mr-2 h-4 w-4" />
          New Service
        </Button>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <Input
            placeholder="Search by service, title, or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
            data-testid="input-search-service-posts"
          />
        </div>

        {rows.length > 0 ? (
          <div className="divide-y divide-border">
            {rows.map((post) => {
              const service = serviceById.get(post.serviceId);
              return (
                <div key={post.id} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold">{post.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Service: {service?.name || `Service #${post.serviceId}`} | Slug: /services/{post.serviceId}/{post.slug}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                        <a
                          href={getServicePostPath(post.serviceId, post.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View page
                        </a>
                      </div>
                    </div>

                    <Button variant="outline" onClick={() => openEditor(post)} data-testid={`button-edit-service-post-${post.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No services found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create your first service to start publishing service pages.</p>
          </div>
        )}
      </div>

      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Service Page</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-post-title">Title *</Label>
              <Input
                id="service-post-title"
                value={formValues.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormValues((prev) => ({
                    ...prev,
                    title: value,
                    slug: prev.slug || slugify(value),
                  }));
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-post-slug">Slug *</Label>
              <Input
                id="service-post-slug"
                value={formValues.slug}
                onChange={(e) => setFormValues((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formValues.status} onValueChange={(value) => setFormValues((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-post-excerpt">Excerpt</Label>
              <Textarea
                id="service-post-excerpt"
                value={formValues.excerpt}
                onChange={(e) => setFormValues((prev) => ({ ...prev, excerpt: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-post-content">Content (HTML supported) *</Label>
              <Textarea
                id="service-post-content"
                value={formValues.content}
                onChange={(e) => setFormValues((prev) => ({ ...prev, content: e.target.value }))}
                rows={12}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-post-meta-description">Meta Description</Label>
                <Textarea
                  id="service-post-meta-description"
                  value={formValues.metaDescription}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, metaDescription: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-post-keyword">Focus Keyword</Label>
                <Input
                  id="service-post-keyword"
                  value={formValues.focusKeyword}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, focusKeyword: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-post-feature-image">Feature Image URL</Label>
              <Input
                id="service-post-feature-image"
                value={formValues.featureImageUrl}
                onChange={(e) => setFormValues((prev) => ({ ...prev, featureImageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (!editingPost) return;
                updatePost.mutate({ id: editingPost.id, values: formValues });
              }}
              disabled={updatePost.isPending || !formValues.title.trim() || !formValues.slug.trim() || !formValues.content.trim()}
            >
              {updatePost.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
