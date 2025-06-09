'use client';

import React from 'react';
import { Performance, Stage } from '../types';

interface TimelineViewProps {
  performances: Performance[];
  stages: Stage[];
  myTimetable: string[];
  toggleMyTimetable: (id: string) => void;
}

const STAGE_COLORS = {
  'GREEN STAGE': 'bg-green-600 text-white',
  'WHITE STAGE': 'bg-gray-200 text-gray-900',
  'RED MARQUEE': 'bg-red-600 text-white',
  'FIELD OF HEAVEN': 'bg-blue-600 text-white'
};

export default function TimelineView({ 
  performances, 
  stages, 
  myTimetable, 
  toggleMyTimetable
}: TimelineViewProps) {
  // 時間帯の生成（10:00から翌朝5:00まで）
  const timeSlots: string[] = [];
  for (let hour = 10; hour < 24; hour++) {
    timeSlots.push(`${hour}:00`);
  }
  for (let hour = 0; hour < 6; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  // 時間重複チェック
  const checkTimeOverlap = (perf1: Performance, perf2: Performance): boolean => {
    if (perf1.stage !== perf2.stage) return false;
    
    const start1 = new Date(`2025-07-${24 + perf1.day} ${perf1.start_time}`);
    const end1 = new Date(`2025-07-${24 + perf1.day} ${perf1.end_time}`);
    const start2 = new Date(`2025-07-${24 + perf2.day} ${perf2.start_time}`);
    const end2 = new Date(`2025-07-${24 + perf2.day} ${perf2.end_time}`);
    
    return (start1 < end2 && end1 > start2);
  };

  // パフォーマンスの配置を計算（重複を考慮）
  const getPerformanceLayout = (performance: Performance, stagePerformances: Performance[]) => {
    const [startHour, startMin] = performance.start_time.split(':').map(Number);
    const [endHour, endMin] = performance.end_time.split(':').map(Number);
    
    // 10:00を基準とした分数に変換
    const startMinutes = (startHour >= 10 ? startHour - 10 : startHour + 14) * 60 + startMin;
    const endMinutes = (endHour >= 10 ? endHour - 10 : endHour + 14) * 60 + endMin;
    
    // 高さと位置を計算（1時間 = 120px）
    const top = (startMinutes / 60) * 120;
    const height = ((endMinutes - startMinutes) / 60) * 120;
    
    // 重複するパフォーマンスを見つける
    const overlapping = stagePerformances.filter(p => 
      p.id !== performance.id && checkTimeOverlap(performance, p)
    );
    
    // 重複がある場合の配置計算
    let leftOffset = 0;
    let width = 100;
    
    if (overlapping.length > 0) {
      // 重複するパフォーマンスのインデックスを取得
      const allOverlapping = [performance, ...overlapping].sort((a, b) => 
        a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id)
      );
      const index = allOverlapping.findIndex(p => p.id === performance.id);
      const totalCount = allOverlapping.length;
      
      width = 100 / totalCount;
      leftOffset = (index * width);
    }
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      minHeight: '60px',
      left: `${leftOffset}%`,
      width: `${width}%`
    };
  };


  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[100px_1fr] gap-0">
          {/* 時刻列 */}
          <div className="sticky left-0 bg-background z-10">
            <div className="h-12 border-b border-border" />
            {timeSlots.map(time => (
              <div key={time} className="h-[120px] border-b border-border px-2 py-1">
                <span className="text-sm text-muted-foreground">{time}</span>
              </div>
            ))}
          </div>
          
          {/* ステージ列 */}
          <div className="grid grid-cols-4 gap-2">
            {stages.map(stage => (
              <div key={stage.id} className="relative">
                {/* ステージヘッダー */}
                <div className={`h-12 flex items-center justify-center font-bold text-sm rounded-t sticky top-0 z-20 ${
                  STAGE_COLORS[stage.name as keyof typeof STAGE_COLORS] || 'bg-gray-600'
                }`}>
                  {stage.name}
                </div>
                
                {/* タイムライン */}
                <div className="relative" style={{ height: `${timeSlots.length * 120}px` }}>
                  {/* 時間線 */}
                  {timeSlots.map((_, idx) => (
                    <div 
                      key={idx} 
                      className="absolute w-full h-[120px] border-b border-border"
                      style={{ top: `${idx * 120}px` }}
                    />
                  ))}
                  
                  {/* パフォーマンス */}
                  {(() => {
                    const stagePerformances = performances.filter(p => p.stage === stage.name);
                    return stagePerformances.map(performance => {
                      const style = getPerformanceLayout(performance, stagePerformances);
                      const isSelected = myTimetable.includes(performance.id);
                      
                      return (
                        <div
                          key={performance.id}
                          onClick={() => toggleMyTimetable(performance.id)}
                          className={`absolute px-2 py-1 rounded cursor-pointer transition-all overflow-hidden border ${
                            isSelected
                              ? 'bg-primary text-primary-foreground z-30 border-primary'
                              : 'bg-card hover:bg-muted/50 border-border text-foreground'
                          }`}
                          style={style}
                        >
                          <div className="text-xs font-semibold truncate">
                            {performance.artist}
                          </div>
                          <div className="text-xs opacity-75">
                            {performance.start_time} - {performance.end_time}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}