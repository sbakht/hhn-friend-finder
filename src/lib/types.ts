export interface FriendLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  updatedAt: number;
  isYou?: boolean;
}

export interface JoinPayload {
  roomId: string;
  name: string;
}
