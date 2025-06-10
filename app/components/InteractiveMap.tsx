'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { TimetableData } from '../types';

// LeafletMapをSSRなしで動的インポート
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] sm:h-[400px] lg:h-[500px] border border-border rounded overflow-hidden flex items-center justify-center">
      <p className="text-muted-foreground">マップを読み込み中...</p>
    </div>
  )
});

interface InteractiveMapProps {
  myTimetable: string[];
  timetableData: TimetableData | null;
  selectedDay: number;
}

export default function InteractiveMap({ myTimetable, timetableData, selectedDay }: InteractiveMapProps) {
  return (
    <div className="w-full">
      <LeafletMap myTimetable={myTimetable} timetableData={timetableData} selectedDay={selectedDay} />
    </div>
  );
}