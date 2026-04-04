export interface WorkspacePerson {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  company: string | null;
  role: string | null;
  teamName: string | null;
  website: string | null;
  timezone: string | null;
  preferredContactMethod: string | null;
  source: string | null;
  sourceRef: string | null;
  lane: string | null;
  intent: string | null;
  score: number | null;
  owner: string | null;
  followUpAt: string | null;
  lastContactAt: string | null;
  status: string | null;
  lastTouchAt: string | null;
  notes: string | null;
}

export interface WorkspaceTeam {
  id: string;
  name: string;
  company: string | null;
  focus: string | null;
  status: string | null;
  memberCount: number | null;
  lastTouchAt: string | null;
}

export interface WorkspaceSignal {
  id: string;
  source: string;
  channel: string;
  lane: string;
  summary: string;
  pathname: string;
  updatedAt: string;
  touchedAt: string | null;
  title: string | null;
  stage: string | null;
  score: number | null;
  intent: string | null;
  contentPreview: string | null;
  contactName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  owner: string | null;
  followUpAt: string | null;
}

export type WorkspaceDashboardState =
  | {
      kind: "missing-config";
    }
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "unauthorized";
      email: string | null;
    }
  | {
      kind: "ready";
      userEmail: string;
      people: WorkspacePerson[];
      teams: WorkspaceTeam[];
      signals: WorkspaceSignal[];
      diagnostics: string[];
    };
