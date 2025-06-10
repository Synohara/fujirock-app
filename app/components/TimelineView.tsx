'use client';

import React, { useState } from 'react';
import { Performance, Stage } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
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
    
    // 0-5時の場合は翌日として扱う
    const adjustTime = (time: string, day: number) => {
      const [hour] = time.split(':').map(Number);
      if (hour >= 0 && hour < 6) {
        return new Date(`2025-07-${24 + day + 1} ${time}`);
      }
      return new Date(`2025-07-${24 + day} ${time}`);
    };
    
    const start1 = adjustTime(perf1.start_time, perf1.day);
    const end1 = adjustTime(perf1.end_time, perf1.day);
    const start2 = adjustTime(perf2.start_time, perf2.day);
    const end2 = adjustTime(perf2.end_time, perf2.day);
    
    return (start1 < end2 && end1 > start2);
  };

  // パフォーマンスの配置を計算（重複を考慮）
  const getPerformanceLayout = (performance: Performance, stagePerformances: Performance[]) => {
    const [startHour, startMin] = performance.start_time.split(':').map(Number);
    const [endHour, endMin] = performance.end_time.split(':').map(Number);
    
    // 10:00を基準とした分数に変換（翌日0-5時は24+時間として扱う）
    const getMinutesFromBase = (hour: number, min: number) => {
      if (hour >= 10) {
        return (hour - 10) * 60 + min; // 10:00-23:59
      } else if (hour >= 0 && hour < 6) {
        return (hour + 14) * 60 + min; // 0:00-5:59 (翌日) = 24:00-29:59相当
      } else {
        return (hour + 14) * 60 + min; // その他の朝の時間
      }
    };
    
    const startMinutes = getMinutesFromBase(startHour, startMin);
    const endMinutes = getMinutesFromBase(endHour, endMin);
    
    // 高さと位置を計算（モバイルでは60px、デスクトップでは120px）
    const pixelsPerHour = typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 120;
    const top = (startMinutes / 60) * pixelsPerHour;
    const height = ((endMinutes - startMinutes) / 60) * pixelsPerHour;
    
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
(
          // 時間を数値に変換（深夜時間0-5時は24+時間として扱う）
          (() => {
            const getTimeValue = (timeStr: string) => {
              const [hour, minute] = timeStr.split(':').map(Number);
              return hour >= 0 && hour < 6 ? (hour + 24) * 60 + minute : hour * 60 + minute;
            };
            return getTimeValue(a.start_time) - getTimeValue(b.start_time);
          })()
        ) || a.id.localeCompare(b.id)
      );
      const index = allOverlapping.findIndex(p => p.id === performance.id);
      const totalCount = allOverlapping.length;
      
      width = 100 / totalCount;
      leftOffset = (index * width);
    }
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      minHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? '40px' : '60px',
      left: `${leftOffset}%`,
      width: `${width}%`
    };
  };


  // モバイルビュー
  const mobileView = (
    <div className="md:hidden">
      {/* ステージセレクター */}
      <div className="flex items-center justify-between mb-4 px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedStageIndex(Math.max(0, selectedStageIndex - 1))}
          disabled={selectedStageIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <div className={`inline-block px-4 py-2 rounded font-bold text-sm ${
            STAGE_COLORS[stages[selectedStageIndex]?.name as keyof typeof STAGE_COLORS] || 'bg-gray-600'
          }`}>
            {stages[selectedStageIndex]?.name}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedStageIndex(Math.min(stages.length - 1, selectedStageIndex + 1))}
          disabled={selectedStageIndex === stages.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* タイムライン */}
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="grid grid-cols-[60px_1fr] gap-0">
            {/* 時刻列 */}
            <div className="sticky left-0 bg-background z-10">
              {timeSlots.map(time => (
                <div key={time} className="h-[60px] border-b border-border px-1 py-1">
                  <span className="text-xs text-muted-foreground">{time}</span>
                </div>
              ))}
            </div>
            
            {/* 選択されたステージ */}
            <div className="relative" style={{ height: `${timeSlots.length * 60}px` }}>
              {/* 時間線 */}
              {timeSlots.map((_, idx) => (
                <div 
                  key={idx} 
                  className="absolute w-full h-[60px] border-b border-border"
                  style={{ top: `${idx * 60}px` }}
                />
              ))}
              
              {/* パフォーマンス */}
              {(() => {
                const stage = stages[selectedStageIndex];
                if (!stage) return null;
                const stagePerformances = performances.filter(p => p.stage === stage.name);
                return stagePerformances.map(performance => {
                  const style = getPerformanceLayout(performance, stagePerformances);
                  const isSelected = myTimetable.includes(performance.id);
                  
                  // モバイル用のスタイルをそのまま使用（getPerformanceLayoutで既に調整済み）
                  const mobileStyle = style;
                  
                  return (
                    <div
                      key={performance.id}
                      onClick={() => toggleMyTimetable(performance.id)}
                      className={`absolute px-1 py-1 rounded cursor-pointer transition-all overflow-hidden border text-xs ${
                        isSelected
                          ? 'bg-primary text-primary-foreground z-30 border-primary'
                          : 'bg-card hover:bg-muted/50 border-border text-foreground'
                      }`}
                      style={mobileStyle}
                    >
                      <div className="font-semibold truncate" style={{ fontSize: '11px' }}>
                        {performance.artist}
                      </div>
                      <div className="opacity-75" style={{ fontSize: '10px' }}>
                        {performance.start_time} - {performance.end_time}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // デスクトップビュー
  const desktopView = (
    <div className="hidden md:block overflow-x-auto">
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

  return (
    <>
      {mobileView}
      {desktopView}
    </>
  );
}