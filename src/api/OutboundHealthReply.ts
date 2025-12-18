export interface OutboundHealthReply {
  tag: string;
  tcp_ms: number | null;
  udp_ms: number | null;
}
