import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div className={className}>
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-destructive" data-testid="text-error-title">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="text-error-message">
              {message}
            </p>
          </div>
        </div>
        {onRetry && (
          <div className="mt-3 ml-8">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              data-testid="button-error-retry"
            >
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
