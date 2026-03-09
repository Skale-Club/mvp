import { cn } from "@/lib/utils";

interface SiteLoaderProps {
  fullScreen?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SiteLoader({ fullScreen = false, className = "", size = "md" }: SiteLoaderProps) {
  const sizeMap = {
    sm: "scale-50",
    md: "scale-100",
    lg: "scale-150",
  };

  const containerClasses = fullScreen 
    ? "fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f1014]" 
    : `flex items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      <div className={cn("loader", sizeMap[size])}>
        <div className="bar1"></div>
        <div className="bar2"></div>
        <div className="bar3"></div>
        <div className="bar4"></div>
        <div className="bar5"></div>
        <div className="bar6"></div>
        <div className="bar7"></div>
        <div className="bar8"></div>
        <div className="bar9"></div>
        <div className="bar10"></div>
        <div className="bar11"></div>
        <div className="bar12"></div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return <SiteLoader fullScreen />;
}

// Keep Spinner for other use cases
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-solid border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
