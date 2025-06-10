'use client';

import React from 'react';
import { TimetableData } from '../types';
import InteractiveMap from './InteractiveMap';
import { MapPin } from 'lucide-react';

interface MapViewProps {
  myTimetable: string[];
  timetableData: TimetableData | null;
  selectedDay: number;
}

export default function MapView({ myTimetable, timetableData, selectedDay }: MapViewProps) {
  return (
    <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
      <h3 className="text-xl sm:text-2xl font-bold mb-4 text-foreground">会場マップ</h3>
      
      <InteractiveMap 
        myTimetable={myTimetable}
        timetableData={timetableData}
        selectedDay={selectedDay}
      />
      
      <div className="mt-4 p-3 bg-muted/50 rounded border border-border">
        <p className="text-sm text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          My Timetableで選択したアーティストのステージ位置がマップ上に表示されます
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          移動スケジュールはMy Timetableで確認できます
        </p>
      </div>
    </div>
  );
}