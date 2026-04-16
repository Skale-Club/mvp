import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mail, MessageSquare, Repeat } from "lucide-react";
import type { NotificationLog } from "@shared/schema";

export function ChannelBadge({ channel }: { channel: string }) {
  const variant = useMemo(() => {
    if (channel === "sms") return "bg-blue-100 text-blue-800 border-blue-200";
    if (channel === "email") return "bg-purple-100 text-purple-800 border-purple-200";
    if (channel === "ghl_sync") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-muted text-muted-foreground border-border";
  }, [channel]);

  const Icon = channel === "sms" ? MessageSquare : channel === "email" ? Mail : Repeat;

  return (
    <Badge variant="outline" className={`gap-1 ${variant}`}>
      <Icon className="h-3 w-3" />
      {channel}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = useMemo(() => {
    if (status === "sent") return "bg-green-100 text-green-800 border-green-200";
    if (status === "failed") return "bg-red-100 text-red-800 border-red-200";
    return "bg-muted text-muted-foreground border-border";
  }, [status]);
  return (
    <Badge variant="outline" className={variant}>
      {status}
    </Badge>
  );
}

export function NotificationPreview({ log }: { log: NotificationLog }) {
  if (log.channel === "email") {
    return (
      <div className="space-y-2">
        {log.subject ? (
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Subject: </span>
            <span>{log.subject}</span>
          </div>
        ) : null}
        <iframe
          srcDoc={log.preview}
          sandbox=""
          className="w-full min-h-[400px] border rounded"
          title="Email preview"
        />
      </div>
    );
  }

  if (log.channel === "ghl_sync") {
    let pretty = log.preview;
    try {
      const parsed = JSON.parse(log.preview);
      pretty = JSON.stringify(parsed, null, 2);
    } catch {
      // keep raw preview
    }
    return (
      <pre className="whitespace-pre-wrap break-words text-xs bg-muted rounded p-3 max-h-[400px] overflow-auto">
        {pretty}
      </pre>
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words text-sm bg-muted rounded p-3">
      {log.preview}
    </pre>
  );
}

export type ChannelSummary = {
  email?: NotificationLog;
  sms?: NotificationLog;
  ghl?: NotificationLog;
};

function formatSentAt(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function truncatePreview(text: string | null | undefined, max = 200): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function channelStatusClasses(log: NotificationLog | undefined): string {
  if (!log) return "text-muted-foreground/50 hover:text-muted-foreground";
  if (log.status === "sent") return "text-green-600 hover:text-green-700";
  if (log.status === "failed") return "text-red-600 hover:text-red-700";
  return "text-muted-foreground";
}

function ChannelIconButton({
  channel,
  log,
  emptyLabel,
  testId,
}: {
  channel: "email" | "sms" | "ghl";
  log: NotificationLog | undefined;
  emptyLabel: string;
  testId?: string;
}) {
  const Icon = channel === "email" ? Mail : channel === "sms" ? MessageSquare : Repeat;
  const classes = channelStatusClasses(log);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded p-1 transition-colors ${classes}`}
          title={log ? `${channel.toUpperCase()}: ${log.status}` : emptyLabel}
          aria-label={log ? `${channel} ${log.status}` : emptyLabel}
          data-testid={testId}
        >
          <Icon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] text-sm">
        {!log ? (
          <p className="text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ChannelBadge channel={log.channel} />
              <StatusBadge status={log.status} />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatSentAt(log.sentAt)}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Recipient</div>
              <div className="font-mono text-xs break-all">{log.recipient}</div>
            </div>
            {log.subject ? (
              <div>
                <div className="text-xs text-muted-foreground">Subject</div>
                <div className="text-xs break-words">{log.subject}</div>
              </div>
            ) : null}
            {log.status === "failed" && log.errorMessage ? (
              <div>
                <div className="text-xs text-muted-foreground">Error</div>
                <div className="text-xs text-red-700 break-words">{log.errorMessage}</div>
              </div>
            ) : null}
            {log.preview ? (
              <div>
                <div className="text-xs text-muted-foreground">Preview</div>
                <div className="text-xs break-words whitespace-pre-wrap bg-muted rounded p-2">
                  {truncatePreview(log.preview)}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function NotificationIconCell({
  summary,
  showGhl = false,
}: {
  summary: ChannelSummary;
  showGhl?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" data-testid="lead-notification-cell">
      <ChannelIconButton
        channel="email"
        log={summary.email}
        emptyLabel="No email notifications yet for this lead"
        testId="lead-notif-email"
      />
      <ChannelIconButton
        channel="sms"
        log={summary.sms}
        emptyLabel="No SMS notifications yet for this lead"
        testId="lead-notif-sms"
      />
      {showGhl ? (
        <ChannelIconButton
          channel="ghl"
          log={summary.ghl}
          emptyLabel="No GHL sync yet for this lead"
          testId="lead-notif-ghl"
        />
      ) : null}
    </div>
  );
}
