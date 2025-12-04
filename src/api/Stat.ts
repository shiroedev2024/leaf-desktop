export interface Stat {
  network: string;
  inbound_tag: string;
  forwarded_source: string;
  source: string;
  destination: string;
  outbound_tag: string;
  bytes_sent: number;
  bytes_recvd: number;
  send_completed: boolean;
  recv_completed: boolean;
  user_id: string;
}
