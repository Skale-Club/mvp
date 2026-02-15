import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { GalleryImage } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Image as ImageIcon, Upload, GripVertical } from "lucide-react";

type GalleryFormValues = {
  title: string;
  altText: string;
  description: string;
  imageUrl: string;
};

type UploadStatus = "pending" | "uploading" | "success" | "error" | "cancelled";

type UploadProgressItem = {
  id: string;
  fileName: string;
  progress: number;
  status: UploadStatus;
  error?: string;
};

type UploadFileToServerOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

function reorderImagesById(images: GalleryImage[], sourceId: number, targetId: number): GalleryImage[] {
  const sourceIndex = images.findIndex((image) => image.id === sourceId);
  const targetIndex = images.findIndex((image) => image.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return images;
  }

  const next = [...images];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  return error instanceof Error && error.name === "AbortError";
}

async function uploadFileToServer(file: File, options: UploadFileToServerOptions = {}): Promise<string> {
  const { signal, onProgress } = options;
  onProgress?.(5);

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;

    const resolveOnce = (value: string) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abortRead);
      resolve(value);
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abortRead);
      reject(error);
    };

    const abortRead = () => {
      try {
        reader.abort();
      } catch {
        // no-op
      }
      rejectOnce(new DOMException("Upload aborted", "AbortError"));
    };

    if (signal?.aborted) {
      rejectOnce(new DOMException("Upload aborted", "AbortError"));
      return;
    }

    signal?.addEventListener("abort", abortRead, { once: true });
    reader.onload = () => {
      const result = reader.result as string;
      resolveOnce(result.split(",")[1]);
    };
    reader.onerror = () => {
      rejectOnce(reader.error || new Error("Failed to read file"));
    };
    reader.onabort = () => {
      rejectOnce(new DOMException("Upload aborted", "AbortError"));
    };
    reader.readAsDataURL(file);
  });

  if (signal?.aborted) {
    throw new DOMException("Upload aborted", "AbortError");
  }

  onProgress?.(20);

  const path = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const resolveOnce = (value: string) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abortUpload);
      resolve(value);
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abortUpload);
      reject(error);
    };

    const abortUpload = () => {
      try {
        xhr.abort();
      } catch {
        // no-op
      }
      rejectOnce(new DOMException("Upload aborted", "AbortError"));
    };

    if (signal?.aborted) {
      rejectOnce(new DOMException("Upload aborted", "AbortError"));
      return;
    }

    signal?.addEventListener("abort", abortUpload, { once: true });

    xhr.open("POST", "/api/upload");
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const networkProgress = (event.loaded / event.total) * 75;
      onProgress?.(Math.min(95, Math.round(20 + networkProgress)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const payload = JSON.parse(xhr.responseText || "{}");
          if (typeof payload.path === "string" && payload.path.length > 0) {
            resolveOnce(payload.path);
            return;
          }
          rejectOnce(new Error("Invalid upload response"));
          return;
        } catch {
          rejectOnce(new Error("Invalid upload response"));
          return;
        }
      }

      try {
        const payload = JSON.parse(xhr.responseText || "{}");
        rejectOnce(new Error(payload.error || payload.message || "Upload failed"));
      } catch {
        rejectOnce(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => rejectOnce(new Error("Upload failed"));
    xhr.onabort = () => rejectOnce(new DOMException("Upload aborted", "AbortError"));

    xhr.send(JSON.stringify({ filename: file.name, data: base64Data, contentType: file.type }));
  });

  onProgress?.(100);
  return path;
}

function GalleryForm({
  initialValues,
  isLoading,
  onSubmit,
}: {
  initialValues: GalleryFormValues;
  isLoading: boolean;
  onSubmit: (values: GalleryFormValues) => void;
}) {
  const [values, setValues] = useState<GalleryFormValues>(initialValues);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const updateField = (field: keyof GalleryFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const imagePath = await uploadFileToServer(file);
      setValues((prev) => ({
        ...prev,
        imageUrl: imagePath,
        altText: prev.altText || file.name.replace(/\.[^/.]+$/, ""),
      }));
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Image upload failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <DialogHeader>
        <DialogTitle>{initialValues.imageUrl ? "Edit Image" : "Add Image"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="gallery-title">Title</Label>
          <Input
            id="gallery-title"
            value={values.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Kitchen Transformation"
            data-testid="input-gallery-title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gallery-alt">Alt Text *</Label>
          <Input
            id="gallery-alt"
            value={values.altText}
            onChange={(e) => updateField("altText", e.target.value)}
            placeholder="Clean modern kitchen after service"
            required
            data-testid="input-gallery-alt"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gallery-description">Description</Label>
          <Textarea
            id="gallery-description"
            value={values.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Optional caption shown on the gallery page."
            rows={3}
            data-testid="input-gallery-description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gallery-image-url">Image URL *</Label>
          <Input
            id="gallery-image-url"
            value={values.imageUrl}
            onChange={(e) => updateField("imageUrl", e.target.value)}
            placeholder="https://..."
            required
            data-testid="input-gallery-image-url"
          />
          <Input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
            data-testid="input-gallery-image-upload"
          />
          {isUploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading image...
            </div>
          ) : null}
        </div>

        {values.imageUrl ? (
          <div className="overflow-hidden rounded-md border border-border">
            <img src={values.imageUrl} alt={values.altText || "Preview"} className="h-44 w-full object-cover" />
          </div>
        ) : null}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isLoading || isUploading} data-testid="button-save-gallery-image">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Image
        </Button>
      </DialogFooter>
    </form>
  );
}

export function GallerySection() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [isQuickUploading, setIsQuickUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadProgressItem[]>([]);
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [orderedImages, setOrderedImages] = useState<GalleryImage[]>([]);
  const [draggedImageId, setDraggedImageId] = useState<number | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<number | null>(null);
  const quickUploadInputRef = useRef<HTMLInputElement | null>(null);
  const uploadControllersRef = useRef<Map<string, AbortController>>(new Map());
  const isCancellingUploadsRef = useRef(false);

  const { data: images, isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["/api/gallery"],
  });

  useEffect(() => {
    setOrderedImages(images || []);
  }, [images]);

  const updateUploadItem = (id: string, patch: Partial<UploadProgressItem>) => {
    setUploadItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const cancelAllUploads = () => {
    isCancellingUploadsRef.current = true;
    uploadControllersRef.current.forEach((controller) => controller.abort());
    uploadControllersRef.current.clear();
    setUploadItems((prev) =>
      prev.map((item) =>
        item.status === "pending" || item.status === "uploading"
          ? { ...item, status: "cancelled", error: "Upload cancelled" }
          : item,
      ),
    );
    setIsQuickUploading(false);
    toast({
      title: "Uploads cancelled",
      description: "All in-progress uploads were stopped.",
    });
  };

  const handleUploadProgressDialogOpenChange = (open: boolean) => {
    if (!open && isQuickUploading) {
      cancelAllUploads();
    }
    setIsUploadDialogOpen(open);
  };

  useEffect(() => {
    return () => {
      uploadControllersRef.current.forEach((controller) => controller.abort());
      uploadControllersRef.current.clear();
    };
  }, []);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || isQuickUploading) return;
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const batchId = Date.now().toString();
    const pendingItems: UploadProgressItem[] = imageFiles.map((file, index) => ({
      id: `${batchId}-${index}-${file.name}`,
      fileName: file.name,
      progress: 0,
      status: "pending",
    }));

    isCancellingUploadsRef.current = false;
    setUploadItems(pendingItems);
    setIsUploadDialogOpen(true);
    setIsQuickUploading(true);

    try {
      const outcomes = await Promise.all(
        pendingItems.map(async (item, index) => {
          const file = imageFiles[index];
          const controller = new AbortController();
          uploadControllersRef.current.set(item.id, controller);
          updateUploadItem(item.id, { status: "uploading", progress: 5, error: undefined });

          try {
            const imagePath = await uploadFileToServer(file, {
              signal: controller.signal,
              onProgress: (progress) => {
                updateUploadItem(item.id, {
                  status: "uploading",
                  progress: Math.min(100, Math.max(0, progress)),
                });
              },
            });

            if (controller.signal.aborted || isCancellingUploadsRef.current) {
              updateUploadItem(item.id, { status: "cancelled", error: "Upload cancelled" });
              return "cancelled" as const;
            }

            const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
            const res = await fetch("/api/gallery", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              signal: controller.signal,
              body: JSON.stringify({
                title: nameWithoutExtension,
                altText: nameWithoutExtension,
                description: null,
                imageUrl: imagePath,
              }),
            });

            if (!res.ok) {
              const message = (await res.text()) || "Failed to save gallery image";
              throw new Error(message);
            }

            updateUploadItem(item.id, { status: "success", progress: 100, error: undefined });
            return "success" as const;
          } catch (error: any) {
            if (controller.signal.aborted || isCancellingUploadsRef.current || isAbortError(error)) {
              updateUploadItem(item.id, { status: "cancelled", error: "Upload cancelled" });
              return "cancelled" as const;
            }

            updateUploadItem(item.id, {
              status: "error",
              error: error?.message || "Upload failed",
            });
            return "error" as const;
          } finally {
            uploadControllersRef.current.delete(item.id);
          }
        }),
      );

      const successCount = outcomes.filter((status) => status === "success").length;
      const failedCount = outcomes.filter((status) => status === "error").length;
      const cancelledCount = outcomes.filter((status) => status === "cancelled").length;

      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
        toast({
          title: successCount === 1 ? "Gallery image uploaded" : `${successCount} gallery images uploaded`,
        });
      }

      if (failedCount > 0) {
        toast({
          title: failedCount === 1 ? "1 image failed to upload" : `${failedCount} images failed to upload`,
          description: "Try uploading the failed files again.",
          variant: "destructive",
        });
      }

      if (cancelledCount > 0 && !isCancellingUploadsRef.current) {
        toast({
          title: cancelledCount === 1 ? "1 upload cancelled" : `${cancelledCount} uploads cancelled`,
        });
      }
    } finally {
      setIsQuickUploading(false);
      setIsUploadDialogOpen(false);
      isCancellingUploadsRef.current = false;
    }
  };

  const handleQuickUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
    e.target.value = "";
  };

  const reorderImages = useMutation({
    mutationFn: async (imageIds: number[]) => {
      await apiRequest("POST", "/api/gallery/reorder", { imageIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reorder images",
        description: error.message,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
  });

  const updateImage = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: GalleryFormValues }) => {
      const body = {
        title: payload.title.trim(),
        altText: payload.altText.trim(),
        description: payload.description.trim() || null,
        imageUrl: payload.imageUrl.trim(),
      };
      const res = await apiRequest("PUT", `/api/gallery/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({ title: "Gallery image updated" });
      setEditingImage(null);
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update image", description: error.message, variant: "destructive" });
    },
  });

  const deleteImage = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({ title: "Gallery image deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete image", description: error.message, variant: "destructive" });
    },
  });

  const deleteAllImages = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiRequest("DELETE", "/api/gallery");
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = (await res.json().catch(() => null)) as { deletedCount?: number } | null;
          if (data) {
            return data;
          }
        }
      } catch {
        // Fallback below for environments where bulk delete endpoint is unavailable.
      }

      const imageIds = orderedImages.map((image) => image.id);
      if (imageIds.length === 0) {
        return { deletedCount: 0 };
      }

      const results = await Promise.allSettled(imageIds.map((id) => apiRequest("DELETE", `/api/gallery/${id}`)));
      const failedCount = results.filter((result) => result.status === "rejected").length;
      const deletedCount = imageIds.length - failedCount;
      if (failedCount > 0) {
        throw new Error("Some images could not be deleted. Please try again.");
      }
      return { deletedCount };
    },
    onSuccess: ({ deletedCount }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      const count = typeof deletedCount === "number" ? deletedCount : orderedImages.length;
      toast({
        title: count === 1 ? "1 gallery image deleted" : `${count} gallery images deleted`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete all images", description: error.message, variant: "destructive" });
    },
  });

  const handleDropzoneDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setIsDropzoneActive(true);
  };

  const handleDropzoneDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setIsDropzoneActive(false);
  };

  const handleDropzoneDrop = async (e: DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setIsDropzoneActive(false);
    if (isQuickUploading) {
      setIsUploadDialogOpen(true);
      return;
    }
    const files = Array.from(e.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
    await uploadFiles(files);
  };

  const handleCardDragStart = (id: number, e: DragEvent<HTMLDivElement>) => {
    setDraggedImageId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  };

  const handleCardDragOver = (id: number, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedImageId === null || draggedImageId === id) return;
    setDragOverImageId(id);
  };

  const handleCardDrop = (targetId: number, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedImageId ?? Number(e.dataTransfer.getData("text/plain"));
    setDraggedImageId(null);
    setDragOverImageId(null);

    if (!Number.isFinite(sourceId) || sourceId === targetId) return;

    const next = reorderImagesById(orderedImages, sourceId, targetId);
    const unchanged = next.every((image, index) => image.id === orderedImages[index]?.id);
    if (unchanged) return;

    setOrderedImages(next);
    reorderImages.mutate(next.map((image) => image.id));
  };

  const getUploadStatusLabel = (status: UploadStatus) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "uploading":
        return "Uploading";
      case "success":
        return "Done";
      case "error":
        return "Error";
      case "cancelled":
        return "Cancelled";
      default:
        return "Pending";
    }
  };

  const getUploadStatusVariant = (status: UploadStatus) => {
    switch (status) {
      case "success":
        return "success" as const;
      case "error":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  const lightBlueBadgeClass =
    "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-300";
  const borderlessOutlineButtonClass = "!border-0 !shadow-none hover:!border-0";

  const getUploadStatusClass = (status: UploadStatus) => {
    if (status === "pending" || status === "uploading" || status === "cancelled") {
      return lightBlueBadgeClass;
    }
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gallery</h1>
          <p className="text-muted-foreground">Upload, reorder, and manage website gallery photos.</p>
        </div>

        <Input
          ref={quickUploadInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleQuickUpload}
          className="hidden"
          data-testid="input-gallery-quick-upload"
        />

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className={borderlessOutlineButtonClass}
                disabled={isQuickUploading || deleteAllImages.isPending || orderedImages.length === 0}
                data-testid="button-delete-all-gallery-images"
              >
                {deleteAllImages.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                )}
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all gallery images?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone and will remove every image from the website gallery.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAllImages.mutate()}
                  variant="destructive"
                  disabled={deleteAllImages.isPending}
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={() => {
              setEditingImage(null);
              quickUploadInputRef.current?.click();
            }}
            disabled={isQuickUploading || deleteAllImages.isPending}
            data-testid="button-add-gallery-image"
          >
            {isQuickUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {isQuickUploading ? "Uploading..." : "Add Image"}
          </Button>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingImage(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <GalleryForm
              initialValues={
                editingImage
                  ? {
                      title: editingImage.title || "",
                      altText: editingImage.altText || "",
                      description: editingImage.description || "",
                      imageUrl: editingImage.imageUrl || "",
                    }
                  : { title: "", altText: "", description: "", imageUrl: "" }
              }
              isLoading={updateImage.isPending}
              onSubmit={(values) => {
                if (!editingImage) return;
                updateImage.mutate({ id: editingImage.id, payload: values });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadProgressDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl" data-testid="dialog-gallery-upload-progress">
          <DialogHeader>
            <DialogTitle>{isQuickUploading ? "Uploading Gallery Images" : "Upload Summary"}</DialogTitle>
            <DialogDescription>
              {isQuickUploading
                ? "Click the X to stop all uploads in progress."
                : "Review the result of each uploaded file."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {uploadItems.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.fileName}</p>
                  <Badge variant={getUploadStatusVariant(item.status)} className={getUploadStatusClass(item.status)}>
                    {getUploadStatusLabel(item.status)}
                  </Badge>
                </div>
                <Progress value={item.progress} className="h-2 bg-sky-100 dark:bg-slate-700" />
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{item.progress}%</span>
                  {item.error ? <span className="truncate text-destructive">{item.error}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Card
        role="button"
        tabIndex={0}
        onClick={() => {
          if (isQuickUploading) {
            setIsUploadDialogOpen(true);
            return;
          }
          quickUploadInputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isQuickUploading) {
              setIsUploadDialogOpen(true);
              return;
            }
            quickUploadInputRef.current?.click();
          }
        }}
        onDragOver={handleDropzoneDragOver}
        onDragLeave={handleDropzoneDragLeave}
        onDrop={handleDropzoneDrop}
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          isDropzoneActive ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/30"
        }`}
        data-testid="gallery-upload-dropzone"
      >
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <Upload className={`h-10 w-10 ${isDropzoneActive ? "text-primary" : "text-muted-foreground"}`} />
          <h3 className="text-lg font-semibold">
            {isQuickUploading ? "Uploading images..." : "Click or drag photos here"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isQuickUploading
              ? "Please wait while your files are being uploaded."
              : "Click to open your desktop and choose files, or drag image files to this area."}
          </p>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orderedImages.length > 0 ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {orderedImages.map((image) => (
            <Card
              key={image.id}
              draggable={!reorderImages.isPending}
              onDragStart={(e) => handleCardDragStart(image.id, e)}
              onDragOver={(e) => handleCardDragOver(image.id, e)}
              onDrop={(e) => handleCardDrop(image.id, e)}
              onDragEnd={() => {
                setDraggedImageId(null);
                setDragOverImageId(null);
              }}
              className={`overflow-hidden border-border transition ${
                draggedImageId === image.id ? "opacity-60" : ""
              } ${dragOverImageId === image.id ? "ring-2 ring-primary" : ""}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {image.imageUrl ? (
                  <img
                    src={image.imageUrl}
                    alt={image.altText || image.title || "Gallery image"}
                    className="h-full w-full object-cover"
                    data-testid={`img-gallery-admin-${image.id}`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Drag to reorder</span>
                  <GripVertical className="h-4 w-4" />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{image.title || "Untitled image"}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{image.altText}</p>
                  </div>
                  <Badge variant="secondary" className={lightBlueBadgeClass}>
                    #{image.id}
                  </Badge>
                </div>

                {image.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{image.description}</p>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={borderlessOutlineButtonClass}
                    onClick={() => {
                      setEditingImage(image);
                      setIsDialogOpen(true);
                    }}
                    data-testid={`button-edit-gallery-${image.id}`}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={borderlessOutlineButtonClass}
                        data-testid={`button-delete-gallery-${image.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete image?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone and will remove this image from the website gallery.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteImage.mutate(image.id)}
                          variant="destructive"
                          disabled={deleteImage.isPending}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No gallery images yet. Upload photos above to populate this section.
        </p>
      )}
    </div>
  );
}

