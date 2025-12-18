export interface FailoverActor {
  name: string;
  ping_ms: number;
  is_selected: boolean;
}

export interface FailoverStatusReply {
  actors: FailoverActor[];
}
