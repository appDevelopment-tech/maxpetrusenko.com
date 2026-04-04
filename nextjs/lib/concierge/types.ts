export type ConciergeLane = "somatic" | "tech" | "bridge" | "general";

export type ConciergeLeadIntent =
  | "book_session"
  | "project_inquiry"
  | "pricing"
  | "fit_check"
  | "bridge_exploration"
  | "general_question";

export type ConciergeLeadStage =
  | "new"
  | "captured"
  | "qualified"
  | "follow_up"
  | "archived";

export type ConciergeLeadUrgency = "low" | "medium" | "high";
export type ConciergeLeadServiceFit = "low" | "medium" | "high";
export type ConciergeContactMethod =
  | "email"
  | "phone"
  | "whatsapp"
  | "zoom"
  | "site-chat";

export interface ConciergeLeadProfile {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  timezone?: string | null;
  preferredContactMethod?: ConciergeContactMethod | null;
}

export interface ConciergeLeadInsight {
  stage: ConciergeLeadStage;
  score: number;
  primaryIntent: ConciergeLeadIntent;
  intentLabel: string;
  urgency: ConciergeLeadUrgency;
  serviceFit: ConciergeLeadServiceFit;
  summary: string;
  desiredOutcome?: string | null;
  timeframe?: string | null;
  budgetSignal?: string | null;
  nextStep?: string | null;
  tags: string[];
  capturedAt: string;
}

export interface ConciergeLead {
  profile: ConciergeLeadProfile;
  insight: ConciergeLeadInsight;
}

export interface ConciergeCrmState {
  stage?: ConciergeLeadStage | null;
  owner?: string | null;
  notes?: string | null;
  followUpAt?: string | null;
  lastContactAt?: string | null;
  updatedAt: string;
}

export interface ConciergeAttachment {
  id: string;
  kind: "image";
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface ConciergeMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  attachments?: ConciergeAttachment[];
  status?: "thinking" | "streaming";
}

export interface ConciergeVisit {
  pathname: string;
  title?: string;
  enteredAt: string;
}

export interface ConciergeContext {
  pathname: string;
  title?: string;
  history?: ConciergeVisit[];
  proactivePrompt?: string | null;
}

export interface ConciergeThread {
  id: string;
  visitorId?: string;
  lane: ConciergeLane;
  createdAt: string;
  updatedAt: string;
  pathname: string;
  title?: string;
  summary: string;
  lead?: ConciergeLead;
  crm?: ConciergeCrmState | null;
  proactivePrompt?: string | null;
  history: ConciergeVisit[];
  messages: ConciergeMessage[];
}

export interface ConciergeUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  lastPathname?: string;
  lastTitle?: string;
  profile?: ConciergeLeadProfile;
  threadIds: string[];
}
