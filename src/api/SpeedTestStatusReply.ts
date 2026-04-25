export interface SpeedTestActorInfo {
  name: string;
  bandwidth_bps: number | null;
  is_selected: boolean;
}

export interface SpeedTestStatusReply {
  actors: SpeedTestActorInfo[];
}
