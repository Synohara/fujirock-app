'use client';

import { useState, useEffect } from 'react';
import { Performance, TimetableData } from '../types';
import MapView from './MapView';
import TimelineView from './TimelineView';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MapPin, Calendar, Download } from 'lucide-react';


export default function TimetableView() {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [myTimetable, setMyTimetable] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fujirock2025-mytimetable');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timetable' | 'map'>('timetable');

  useEffect(() => {
    fetch('/timetable.json')
      .then(res => res.json())
      .then(data => setTimetableData(data))
      .catch(err => console.error('Failed to load timetable:', err));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fujirock2025-mytimetable', JSON.stringify(myTimetable));
    }
  }, [myTimetable]);

  if (!timetableData) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const dayPerformances = timetableData.performances
    .filter(p => p.day === selectedDay)
    .filter(p => selectedStage === 'all' || p.stage === selectedStage)
    .filter(p => searchQuery === '' || p.artist.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const stages = selectedStage === 'all' 
    ? timetableData.stages 
    : timetableData.stages.filter(s => s.name === selectedStage);

  const toggleMyTimetable = (performanceId: string) => {
    setMyTimetable(prev => 
      prev.includes(performanceId)
        ? prev.filter(id => id !== performanceId)
        : [...prev, performanceId]
    );
  };

  const checkTimeConflict = (perf1: Performance, perf2: Performance): boolean => {
    if (perf1.day !== perf2.day) return false;
    
    const start1 = new Date(`2025-07-${24 + perf1.day} ${perf1.start_time}`);
    const end1 = new Date(`2025-07-${24 + perf1.day} ${perf1.end_time}`);
    const start2 = new Date(`2025-07-${24 + perf2.day} ${perf2.start_time}`);
    const end2 = new Date(`2025-07-${24 + perf2.day} ${perf2.end_time}`);
    
    return (start1 < end2 && end1 > start2);
  };

  const groupByStage = (performances: Performance[]) => {
    if (!stages || stages.length === 0) return {};
    return stages.reduce((acc, stage) => {
      acc[stage.name] = performances.filter(p => p.stage === stage.name);
      return acc;
    }, {} as Record<string, Performance[]>);
  };

  // const performancesByStage = groupByStage(dayPerformances);

  const exportTimetable = () => {
    const selectedPerformances = myTimetable
      .map(id => timetableData?.performances.find(p => p.id === id))
      .filter((p): p is Performance => p !== undefined)
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.start_time.localeCompare(b.start_time);
      });

    let exportText = "FUJI ROCK FESTIVAL 2025 - My Timetable\n";
    exportText += "==========================================\n\n";

    let currentDay = 0;
    selectedPerformances.forEach(perf => {
      if (perf.day !== currentDay) {
        currentDay = perf.day;
        exportText += `\nDay ${perf.day} (${perf.date})\n`;
        exportText += "-------------------\n";
      }
      exportText += `${perf.start_time} - ${perf.end_time} | ${perf.artist} @ ${perf.stage}\n`;
    });

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fujirock2025_mytimetable.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* メインコンテンツ */}
      <div className="flex-1 container mx-auto px-4 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center text-primary">
          FUJI ROCK FESTIVAL 2025
        </h1>
        
        <Tabs value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(Number(v))} className="w-full mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-card/50 backdrop-blur border border-border">
            {[1, 2, 3].map(day => (
              <TabsTrigger
                key={day}
                value={day.toString()}
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                Day {day} (7/{24 + day})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card className="p-4 mb-6 max-w-4xl mx-auto bg-card/80 backdrop-blur border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="アーティストを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-4 py-2 rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="all">すべてのステージ</option>
              {timetableData.stages.map(stage => (
                <option key={stage.id} value={stage.name}>{stage.name}</option>
              ))}
            </select>
          </div>
        </Card>

        <div className="flex justify-center mb-6 gap-4">
          <Button
            onClick={() => setViewMode('timetable')}
            variant={viewMode === 'timetable' ? 'default' : 'outline'}
            className={viewMode === 'timetable' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' : ''}
          >
            <Calendar className="mr-2 h-4 w-4" />
            タイムテーブル
          </Button>
          <Button
            onClick={() => setViewMode('map')}
            variant={viewMode === 'map' ? 'default' : 'outline'}
            className={viewMode === 'map' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' : ''}
          >
            <MapPin className="mr-2 h-4 w-4" />
            会場マップ・動線
          </Button>
        </div>


        {viewMode === 'timetable' ? (
          <TimelineView 
            performances={dayPerformances}
            stages={stages}
            myTimetable={myTimetable}
            toggleMyTimetable={toggleMyTimetable}
          />
        ) : (
          <MapView 
            myTimetable={myTimetable}
            timetableData={timetableData}
            selectedDay={selectedDay}
          />
        )}

      </div>

      {/* 右サイドバー - My Timetable */}
      {myTimetable.length > 0 && (
        <div className="w-80 bg-card/80 backdrop-blur p-4 overflow-y-auto border-l border-border">
          <div className="sticky top-0 bg-card pb-2 mb-4">
            <h3 className="text-xl font-bold flex justify-between items-center">
              My Timetable
              <Button
                onClick={() => exportTimetable()}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </h3>
            <div className="text-xs text-muted-foreground mt-1">
              選択: {myTimetable.length}件
            </div>
          </div>
          <div className="space-y-2">
            {(() => {
              const dayPerformances = myTimetable
                .map(id => {
                  const performance = timetableData?.performances.find(p => p.id === id);
                  if (!performance || performance.day !== selectedDay) return null;
                  return { id, performance };
                })
                .filter(item => item !== null)
                .sort((a, b) => a!.performance.start_time.localeCompare(b!.performance.start_time));

              if (dayPerformances.length === 0) {
                return <p className="text-sm text-muted-foreground">Day {selectedDay} に選択されたアーティストはありません</p>;
              }

              // 時間軸表示用の時間帯生成
              const timeSlots: string[] = [];
              for (let hour = 10; hour < 24; hour++) {
                timeSlots.push(`${hour}:00`);
              }
              for (let hour = 0; hour < 6; hour++) {
                timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
              }

              // 時間重複チェック
              const checkTimeOverlap = (perf1: any, perf2: any): boolean => {
                const start1 = new Date(`2025-07-${24 + perf1.day} ${perf1.start_time}`);
                const end1 = new Date(`2025-07-${24 + perf1.day} ${perf1.end_time}`);
                const start2 = new Date(`2025-07-${24 + perf2.day} ${perf2.start_time}`);
                const end2 = new Date(`2025-07-${24 + perf2.day} ${perf2.end_time}`);
                
                return (start1 < end2 && end1 > start2);
              };

              // パフォーマンスの位置計算（重複を考慮）
              const getPerformancePosition = (performance: any, allPerformances: any[]) => {
                const [startHour, startMin] = performance.start_time.split(':').map(Number);
                const [endHour, endMin] = performance.end_time.split(':').map(Number);
                
                const startMinutes = (startHour >= 10 ? startHour - 10 : startHour + 14) * 60 + startMin;
                const endMinutes = (endHour >= 10 ? endHour - 10 : endHour + 14) * 60 + endMin;
                
                const top = (startMinutes / 60) * 50; // 1時間 = 50px (間隔拡大)
                const height = Math.max(((endMinutes - startMinutes) / 60) * 50, 30); // 最小30px
                
                // 重複するパフォーマンスを見つける
                const overlapping = allPerformances.filter(p => 
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
                
                return { top, height, leftOffset, width };
              };

              return (
                <>
                  <h4 className="text-sm font-semibold text-primary mb-3">Day {selectedDay} (7/{24 + selectedDay})</h4>
                  <div className="relative bg-card/50 rounded-lg p-2" style={{ height: `${timeSlots.length * 50}px` }}>
                    {/* 時間軸の背景線 */}
                    {timeSlots.map((time, idx) => (
                      <div key={time} className="absolute w-full flex items-center" style={{ top: `${idx * 50}px`, height: '50px' }}>
                        <div className="text-xs text-muted-foreground w-12 flex-shrink-0">{time}</div>
                        <div className="flex-1 h-px bg-border ml-2"></div>
                      </div>
                    ))}
                    
                    {/* パフォーマンス */}
                    {dayPerformances.map(item => {
                      const { id, performance } = item!;
                      const allDayPerformances = dayPerformances.map(item => item!.performance);
                      const { top, height, leftOffset, width } = getPerformancePosition(performance, allDayPerformances);
                      const conflicts = myTimetable.filter(otherId => {
                        if (otherId === id) return false;
                        const otherPerf = timetableData?.performances.find(p => p.id === otherId);
                        return otherPerf && checkTimeConflict(performance, otherPerf);
                      });
                      
                      return (
                        <div 
                          key={id} 
                          className={`absolute px-1 py-1 rounded text-xs overflow-visible border ${
                            conflicts.length > 0 
                              ? 'bg-red-100 border-red-300 text-red-800' 
                              : 'bg-primary/90 border-primary text-primary-foreground'
                          }`}
                          style={{ 
                            top: `${top}px`, 
                            height: `${height}px`,
                            left: `${56 + (leftOffset * (320 - 56 - 32) / 100)}px`,
                            width: `${(320 - 56 - 32) * width / 100 - 4}px`,
                            zIndex: conflicts.length > 0 ? 20 : 10,
                            marginRight: '2px'
                          }}
                        >
                          <div className="font-semibold text-xs leading-tight" style={{ fontSize: '10px' }}>
                            {performance.artist}
                          </div>
                          <div className="opacity-75 leading-tight" style={{ fontSize: '9px' }}>
                            {performance.stage}
                          </div>
                          {conflicts.length > 0 && (
                            <div className="text-red-600 leading-tight" style={{ fontSize: '8px' }}>
                              ⚠️重複
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}