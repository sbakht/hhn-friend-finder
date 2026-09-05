export interface FriendLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  updatedAt: number;
  latestStatus?: string | null;
  latestStatusAt?: number | null;
  isYou?: boolean;
}

export interface StatusUpdate {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  createdAt: number;
}

export interface JoinPayload {
  roomId: string;
  name: string;
}

export interface JoinResponse {
  userId: string;
  users: FriendLocation[];
  statuses: StatusUpdate[];
}
