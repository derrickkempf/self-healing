export interface User {
  id: string;
  email: string;
  whitelisted: boolean;
  last_login: string | null;
}

export interface AuthCode {
  id: string;
  email: string;
  code: string;
  created_at: string;
  expires_at: string;
  used: boolean;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_email: string;
}

export interface Message {
  id: string;
  sender_email: string;
  content: string;
  created_at: string;
}

export interface Session {
  token: string;
  email: string;
  issued_at: string;
}

export interface Profile {
  email: string;            // primary key (matches the auth email)
  display_name: string;
  tagline: string;
  avatar_url: string | null; // base64 data url in mocked backend
  cover_url: string | null;
  links: string[];
}

export interface GalleryImage {
  id: string;
  url: string;          // base64 data url in mocked backend
  caption: string;      // optional, "" if none
  position: number;     // sort order — lower comes first
  created_at: string;
}

export interface NotificationPrefs {
  email: string;
  // Show a browser notification (and, in production, send email) when a new
  // post is published to the feed.
  new_posts: boolean;
  // Show a browser notification when a new chat message arrives.
  new_messages: boolean;
  // Don't show notifications for content I posted myself.
  ignore_own: boolean;
  // Email digest cadence. "off" means no email at all.
  email_digest: "off" | "daily" | "weekly";
}
