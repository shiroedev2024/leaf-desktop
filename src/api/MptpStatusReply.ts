export interface MptpLinkInfo {
  tag: string;
  direction: string;
  total_sent: number;
  total_recved: number;
  roundtrip_ms: number;
  is_working: boolean;
}

export interface MptpSessionInfo {
  id: string;
  established: boolean;
  send_space: number;
  sent_unacked: number;
  links: MptpLinkInfo[];
}

export interface MptpStatusReply {
  tag: string;
  actors: string[];
  sessions: MptpSessionInfo[];
}
