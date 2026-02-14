import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { GalleryImage } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [orderedImages, setOrderedImages] = useState<GalleryImage[]>([]);
  const [draggedImageId, setDraggedImageId] = useState<number | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<number | null>(null);
  const quickUploadInputRef = useRef<HTMLInputElement | null>(null);

  const { data: images, isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["/api/gallery"],
  });

  useEffect(() => {
    setOrderedImages(images || []);
  }, [images]);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsQuickUploading(true);
    try {
      const uploadResults = await Promise.allSettled(
        files.map(async (file) => {
          const imagePath = await uploadFileToServer(file);
          const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
          const body = {
            title: nameWithoutExtension,
            altText: nameWithoutExtension,
            description: null,
            imageUrl: imagePath,
          };
          await apiRequest("POST", "/api/gallery", body);
        }),
      );

      const successCount = uploadResults.filter((result) => result.status === "fulfilled").length;
      const failedCount = uploadResults.length - successCount;

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
    } finally {
      setIsQuickUploading(false);
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

        <Button
          onClick={() => {
            setEditingImage(null);
            quickUploadInputRef.current?.click();
          }}
          disabled={isQuickUploading}
          data-testid="button-add-gallery-image"
        >
          {isQuickUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {isQuickUploading ? "Uploading..." : "Add Image"}
        </Button>

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

      <Card
        role="button"
        tabIndex={0}
        onClick={() => quickUploadInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
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
                  <Badge variant="secondary">#{image.id}</Badge>
                </div>

                {image.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{image.description}</p>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
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
                      <Button variant="outline" size="sm" data-testid={`button-delete-gallery-${image.id}`}>
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
