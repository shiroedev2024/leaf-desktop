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
  start_time: number;
  dns_sniffed_domain: string | null;
  tls_sniffed_domain: string | null;
  http_sniffed_domain: string | null;
  user_id: string | null;
}
