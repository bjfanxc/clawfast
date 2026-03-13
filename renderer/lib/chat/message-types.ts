export interface MessageContentItem {
  type: "text" | "image" | "tool_use" | "tool_result" | "image_url";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
  image_url?: {
    url: string;
  };
  id?: string;
  name?: string;
  input?: unknown;
  content?: string | MessageContentItem[];
  is_error?: boolean;
  [key: string]: unknown;
}

export interface NormalizedMessage {
  id?: string;
  role: string;
  content: MessageContentItem[];
  timestamp: number;
  senderLabel?: string | null;
  status?: "sending" | "sent" | "error";
  error?: string;
}
