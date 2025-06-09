'use client';

import React from 'react';
import { Performance, TimetableData } from '../types';
import InteractiveMap from './InteractiveMap';

interface MapViewProps {
  myTimetable: string[];
  timetableData: TimetableData | null;
  selectedDay: number;
}

export default function MapView({ myTimetable, timetableData, selectedDay }: MapViewProps) {
  const getSelectedPerformances = () => {
    if (!timetableData) return [];
    return myTimetable
      .map(id => timetableData.performances.find(p => p.id === id))
      .filter((p): p is Performance => p !== undefined && p.day === selectedDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getWalkingTime = (fromStage: string, toStage: string): string => {
    if (fromStage === toStage) return "0";
    
    // 公式移動時間表に基づく正確な時間
    const times: Record<string, Record<string, string>> = {
      'GREEN STAGE': {
        'WHITE STAGE': '10',
        'RED MARQUEE': '4', 
        'FIELD OF HEAVEN': '15'
      },
      'WHITE STAGE': {
        'GREEN STAGE': '10',
        'RED MARQUEE': '14',
        'FIELD OF HEAVEN': '5'
      },
      'RED MARQUEE': {
        'GREEN STAGE': '4',
        'WHITE STAGE': '14', 
        'FIELD OF HEAVEN': '19'
      },
      'FIELD OF HEAVEN': {
        'GREEN STAGE': '15',
        'WHITE STAGE': '5',
        'RED MARQUEE': '19'
      }
    };
    
    return times[fromStage]?.[toStage] || '10';
  };

  const selectedPerformances = getSelectedPerformances();

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="text-2xl font-bold mb-4 text-foreground">会場マップ・動線</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InteractiveMap 
          myTimetable={myTimetable}
          timetableData={timetableData}
          selectedDay={selectedDay}
        />
        
        <div className="space-y-2">
          <h4 className="text-lg font-semibold mb-3 text-foreground">Day {selectedDay} の移動スケジュール</h4>
          {selectedPerformances.length === 0 ? (
            <p className="text-muted-foreground">このDay に選択されたパフォーマンスはありません</p>
          ) : (
            <div className="space-y-2">
              {selectedPerformances.map((perf, idx) => (
                <React.Fragment key={perf.id}>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded border border-border">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{perf.artist}</div>
                      <div className="text-sm text-muted-foreground">
                        {perf.start_time} - {perf.end_time} @ {perf.stage}
                      </div>
                    </div>
                  </div>
                  {idx < selectedPerformances.length - 1 && (
                    <div className="text-center text-muted-foreground text-sm py-2">
                      {perf.stage === selectedPerformances[idx + 1].stage ? (
                        <span className="text-secondary">↓ 同じステージ</span>
                      ) : (
                        <>↓ {getWalkingTime(perf.stage, selectedPerformances[idx + 1].stage)}分</>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
              
              {selectedPerformances.length > 1 && (
                <div className="mt-4 p-3 bg-secondary/10 rounded border border-secondary/20">
                  <p className="text-sm text-foreground">
                    総移動回数: {selectedPerformances.length - 1}回
                  </p>
                  <p className="text-sm text-xs text-muted-foreground mt-2">
                    ※ 移動時間は徒歩での目安時間です
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}