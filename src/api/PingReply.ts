export interface PingReply {
  tcp_target: string | null;
  udp_target: string | null;
  tcp_ms: number | null;
  udp_ms: number | null;
}
