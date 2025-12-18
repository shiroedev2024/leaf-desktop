export interface OutboundGroup {
  tag: string;
  type: string;
}

export interface OutboundListReply {
  outbounds: OutboundGroup[];
}
