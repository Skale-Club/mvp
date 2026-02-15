import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ServicePost } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Image, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";


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
    body: JSON.stringify({ filename: file.name, data: base64Data, contentType: file.type }),
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

  const { data: posts, isLoading } = useQuery<ServicePost[]>({
    queryKey: ["/api/service-posts", "admin"],
    queryFn: () => fetch("/api/service-posts").then((res) => res.json()),
  });
  const postsList = Array.isArray(posts) ? posts : [];

  const resetCreateState = useCallback(() => {
    setCreateForm(CREATE_INITIAL_VALUES);
    setIsEditorExpanded(false);
    setEditingPost(null);
    if (contentRef.current) {
      contentRef.current.innerHTML = "";
    }
    lastContentRef.current = "";
  }, []);

  const rows = useMemo(() => {
    const lower = search.toLowerCase();
    return postsList.filter((post) => {
      return (
        post.title.toLowerCase().includes(lower) ||
        post.slug.toLowerCase().includes(lower)
      );
    });
  }, [postsList, search]);

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

  const handleEditorImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imagePath = await uploadFileToServer(file);
      if (contentRef.current) {
        contentRef.current.focus();
        document.execCommand("insertImage", false, imagePath);
        syncEditorContent();
      }
      toast({ title: "Image inserted successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
    
    // Reset input
    event.target.value = "";
  };

  useEffect(() => {
    if (!isCreateOpen || !contentRef.current) return;
    if (createForm.content === lastContentRef.current) return;
    if (document.activeElement === contentRef.current) return;
    contentRef.current.innerHTML = createForm.content;
    lastContentRef.current = createForm.content;
  }, [createForm.content, isCreateOpen]);

  const updatePost = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: ServicePostFormValues }) => {
      const cleanContent = values.content.trim();
      const plainContent = stripHtml(cleanContent);
      const excerpt = values.excerpt.trim() || plainContent.slice(0, 220) || values.title.trim();

      const payload = {
        title: values.title.trim(),
        slug: values.slug.trim(),
        status: values.status,
        excerpt,
        content: cleanContent,
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

  const deletePost = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/service-posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-posts"] });
      toast({ title: "Service page deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete service page", description: error.message, variant: "destructive" });
    },
  });

  const createServicePost = useMutation({
    mutationFn: async (values: CreateServiceFormValues) => {
      const cleanName = values.name.trim();
      const cleanSlug = slugify(values.slug || cleanName);
      const cleanContent = values.content.trim();
      const plainContent = stripHtml(cleanContent);
      const excerpt = values.metaDescription.trim() || plainContent.slice(0, 220) || cleanName;

      await apiRequest("POST", "/api/service-posts", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/service-posts"] });
      toast({ title: "Service post created successfully" });
      setIsCreateOpen(false);
      resetCreateState();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create service post", description: error.message, variant: "destructive" });
    },
  });

  const openEditor = (post: ServicePost) => {
    setEditingPost(post);
    setCreateForm({
      name: post.title || "",
      slug: post.slug || "",
      focusKeyword: post.focusKeyword || "",
      content: post.content || "",
      metaDescription: post.metaDescription || "",
      featureImageUrl: post.featureImageUrl || "",
      status: (post.status as "draft" | "published") || "draft",
    });

    if (contentRef.current) {
      contentRef.current.innerHTML = post.content || "";
    }
    lastContentRef.current = post.content || "";
    setIsCreateOpen(true);
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

        if (editingPost) {
          updatePost.mutate({
            id: editingPost.id,
            values: {
              title: createForm.name,
              slug: createForm.slug,
              status: createForm.status,
              excerpt: createForm.metaDescription, // Use metaDescription as excerpt
              content: normalizedContent,
              metaDescription: createForm.metaDescription,
              focusKeyword: createForm.focusKeyword,
              featureImageUrl: createForm.featureImageUrl,
            },
          });
        } else {
          createServicePost.mutate({
            ...createForm,
            content: normalizedContent,
          });
        }
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
                slug: editingPost ? prev.slug : (prev.slug || slugify(e.target.value)), // Don't auto-update slug on edit unless empty
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
            <button
              type="button"
              onClick={() => document.getElementById("editorImageUpload")?.click()}
              className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted"
            >
              Img
            </button>
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
            <input
              id="editorImageUpload"
              type="file"
              accept="image/*"
              onChange={handleEditorImageUpload}
              className="hidden"
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
              createServicePost.isPending ||
              updatePost.isPending ||
              !createForm.name.trim() ||
              !createForm.slug.trim()
            }
            data-testid="button-service-create-submit"
          >
            {createServicePost.isPending || updatePost.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editingPost ? "Save Changes" : "Create Service Post"}
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
            <h1 className="text-2xl font-bold">{editingPost ? "Edit Service" : "Create New Service"}</h1>
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
            {rows.map((post) => (
              <div key={post.id} className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    {post.featureImageUrl && (
                      <div className="h-16 w-[5.33rem] shrink-0 overflow-hidden rounded-md border bg-muted">
                        <img
                          src={post.featureImageUrl}
                          alt={post.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold">{post.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Slug: /services/{post.slug}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                        <a
                          href={`/services/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View page
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openEditor(post)} data-testid={`button-edit-service-post-${post.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-destructive hover:text-destructive" data-testid={`button-delete-service-post-${post.id}`}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Service Page</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{post.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePost.mutate(post.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletePost.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No services found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create your first service to start publishing service pages.</p>
          </div>
        )}
      </div>
    </div>
  );
}

