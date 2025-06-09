export interface Performance {
  id: string;
  artist: string;
  stage: string;
  day: number;
  date: string;
  start_time: string;
  end_time: string;
}

export interface Stage {
  id: string;
  name: string;
  capacity: number;
  location: string;
}

export interface TimetableData {
  performances: Performance[];
  stages: Stage[];
}