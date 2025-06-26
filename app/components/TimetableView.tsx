'use client';

import { useState, useEffect } from 'react';
import { Performance, TimetableData } from '../types';
import TimelineView from './TimelineView';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React from 'react';
import { Search, Calendar, X, Star, Share2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const STAGE_COLORS = {
  'GREEN STAGE': 'bg-green-600 text-white',
  'WHITE STAGE': 'bg-gray-200 text-gray-900',
  'RED MARQUEE': 'bg-red-600 text-white',
  'FIELD OF HEAVEN': 'bg-blue-600 text-white'
};

export default function TimetableView() {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
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
  const [viewMode, setViewMode] = useState<'timetable' | 'mytimetable'>('timetable');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setLoadingError(null);
    
    fetch('/timetable.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // データの構造を検証
        if (!data.performances || !data.stages) {
          throw new Error('Invalid data structure');
        }
        setTimetableData(data);
        setLoadingError(null);
      })
      .catch(err => {
        console.error('Failed to load timetable:', err);
        setLoadingError(err.message || 'データの読み込みに失敗しました');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fujirock2025-mytimetable', JSON.stringify(myTimetable));
    }
  }, [myTimetable]);

  if (isLoading || !timetableData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" message="タイムテーブルを読み込み中..." />
          <div className="mt-4 space-y-1">
            <p className="text-sm text-muted-foreground animate-pulse">FUJI ROCK FESTIVAL 2025</p>
            <p className="text-xs text-muted-foreground/70">データを準備しています</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4 text-red-500">
            <X className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-bold mb-2">データの読み込みに失敗しました</h2>
          <p className="text-muted-foreground mb-4">{loadingError}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="mr-2"
          >
            再読み込み
          </Button>
        </div>
      </div>
    );
  }

  const dayPerformances = timetableData.performances
    .filter(p => p.day === selectedDay)
    .filter(p => selectedStage === 'all' || p.stage === selectedStage)
    .filter(p => searchQuery === '' || p.artist.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const stages = selectedStage === 'all' 
    ? timetableData.stages 
    : timetableData.stages.filter(s => s.name === selectedStage);

  const toggleMyTimetable = (performanceId: string) => {
    // 追加/削除時の視覚的フィードバック
    const button = document.querySelector(`[data-performance-id="${performanceId}"]`);
    if (button) {
      button.classList.add('scale-95');
      setTimeout(() => button.classList.remove('scale-95'), 200);
    }
    
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



  const handleViewModeChange = (mode: 'timetable' | 'mytimetable') => {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode(mode);
      setIsTransitioning(false);
    }, 150);
  };


  const shareMyTimetable = async () => {
    setIsSharing(true);
    
    try {
      // 選択されたパフォーマンスを取得
      const selectedPerformances = myTimetable
        .map(id => timetableData?.performances.find(p => p.id === id))
        .filter((p): p is Performance => p !== undefined && p.day === selectedDay)
        .sort((a, b) => {
          const getTimeValue = (timeStr: string) => {
            const [hour, minute] = timeStr.split(':').map(Number);
            return hour >= 0 && hour < 6 ? (hour + 24) * 60 + minute : hour * 60 + minute;
          };
          return getTimeValue(a.start_time) - getTimeValue(b.start_time);
        });

      if (selectedPerformances.length === 0) {
        alert('選択されたアーティストがありません。');
        return;
      }

      // Canvas作成
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // 高解像度対応のキャンバスサイズ設定（スマホ最適化）
      const scale = 3; // 3倍の解像度
      const width = 520; // さらに幅を縮小
      const itemHeight = 40; // アイテム高をさらに縮小（コンパクト化）
      const headerHeight = 70; // ヘッダー高をさらに縮小
      const padding = 12; // パディングをさらに削減
      const height = headerHeight + (selectedPerformances.length * itemHeight) + padding * 2;
      
      canvas.width = width * scale;
      canvas.height = height * scale;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      // 高解像度描画のためのスケール設定
      ctx.scale(scale, scale);

      // 背景色（白）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // フォント設定（高品質レンダリング）
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // ヘッダー描画（中央寄せ）
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('FUJI ROCK FESTIVAL 2025', width / 2, padding);
      
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#D97706';
      ctx.fillText(`My Timetable - Day ${selectedDay}`, width / 2, padding + 25);

      // 各パフォーマンスを描画
      selectedPerformances.forEach((performance, index) => {
        const y = headerHeight + (index * itemHeight) + padding;
        
        // ステージ色を取得
        let stageColor = '#666666';
        switch (performance.stage) {
          case 'GREEN STAGE':
            stageColor = '#16A34A';
            break;
          case 'WHITE STAGE':
            stageColor = '#E5E5E5';
            break;
          case 'RED MARQUEE':
            stageColor = '#DC2626';
            break;
          case 'FIELD OF HEAVEN':
            stageColor = '#2563EB';
            break;
        }

        // ステージバー（左端に配置）
        ctx.fillStyle = stageColor;
        ctx.fillRect(15, y, 3, itemHeight - 4);

        // テキストを左寄せに変更してから描画
        ctx.textAlign = 'left';

        // アーティスト名（左寄せで配置）
        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(performance.artist, 25, y + 2);

        // 時間（左寄せで配置）
        ctx.fillStyle = '#6B7280';
        ctx.font = '11px Arial';
        ctx.fillText(`${performance.start_time} - ${performance.end_time}`, 25, y + 18);

        // ステージ名（右端に配置）
        ctx.textAlign = 'right';
        ctx.fillStyle = '#374151';
        ctx.font = '10px Arial';
        ctx.fillText(performance.stage, width - 15, y + 18);

        // 次の要素のため中央寄せに戻す
        ctx.textAlign = 'center';
      });

      // Canvas を Blob に変換
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Web Share API が利用可能かチェック
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `fujirock2025_mytimetable_day${selectedDay}.png`, { type: 'image/png' });
        
        // ファイルが共有可能かチェック
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `FUJI ROCK 2025 My Timetable - Day ${selectedDay}`,
            text: `FUJI ROCK FESTIVAL 2025のDay ${selectedDay}のタイムテーブルをシェアします！`,
            files: [file]
          });
        } else {
          // ファイル共有がサポートされていない場合、URLのみ共有
          await navigator.share({
            title: `FUJI ROCK 2025 My Timetable - Day ${selectedDay}`,
            text: `FUJI ROCK FESTIVAL 2025のDay ${selectedDay}のタイムテーブルをシェアします！`,
            url: window.location.href
          });
          
          // 画像は別途ダウンロード
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `fujirock2025_mytimetable_day${selectedDay}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        // Web Share API が利用できない場合は従来のダウンロード
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fujirock2025_mytimetable_day${selectedDay}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('シェアに失敗しました。もう一度お試しください。');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-primary text-center">
            FUJI ROCK FESTIVAL 2025
          </h1>
        </div>
        
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

        <Card className="p-4 mb-6 mx-auto bg-card/80 backdrop-blur border-border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${
                isSearching ? 'text-primary animate-pulse' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="アーティストを検索..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearching(true);
                  setTimeout(() => setIsSearching(false), 600);
                }}
                className="pl-10 pr-10 py-2 w-full rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
              {!isSearching && searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
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

        <div className="flex flex-col sm:flex-row justify-center mb-6 gap-4">
          <Button
            onClick={() => handleViewModeChange('timetable')}
            variant={viewMode === 'timetable' ? 'default' : 'outline'}
            className={viewMode === 'timetable' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' : ''}
          >
            <Calendar className="mr-2 h-4 w-4" />
            タイムテーブル
          </Button>
          <Button
            onClick={() => handleViewModeChange('mytimetable')}
            variant={viewMode === 'mytimetable' ? 'default' : 'outline'}
            className={viewMode === 'mytimetable' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' : ''}
          >
            <Star className="mr-2 h-4 w-4" />
            My Timetable
            {myTimetable.length > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {myTimetable.length}
              </span>
            )}
          </Button>
        </div>


        <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {isTransitioning && (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="md" />
            </div>
          )}
          
          {!isTransitioning && viewMode === 'timetable' && (
            <>
              {isSearching ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner size="md" message="検索中..." />
                </div>
              ) : dayPerformances.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery ? '検索結果が見つかりません' : 'パフォーマンスが見つかりません'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? `"${searchQuery}" に一致するアーティストが見つかりませんでした` : '選択された条件に一致するパフォーマンスがありません'}
                  </p>
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchQuery('')}
                      size="sm"
                    >
                      検索をクリア
                    </Button>
                  )}
                </div>
              ) : (
                <TimelineView 
                  performances={dayPerformances}
                  stages={stages}
                  myTimetable={myTimetable}
                  toggleMyTimetable={toggleMyTimetable}
                />
              )}
            </>
          )}
          
          
          {!isTransitioning && viewMode === 'mytimetable' && (
          <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">My Timetable</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => shareMyTimetable()}
                  size="sm"
                  variant="outline"
                  disabled={isSharing || myTimetable.length === 0}
                  className={isSharing ? 'opacity-50 cursor-not-allowed' : ''}
                  title="タイムテーブルをシェア"
                >
                  {isSharing ? (
                    <div className="mr-2">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    <Share2 className="h-4 w-4 mr-2" aria-label="シェア" />
                  )}
                  {isSharing ? 'シェア中...' : 'シェア'}
                </Button>
                {/* <Button
                  onClick={() => exportTimetable()}
                  size="sm"
                  variant="outline"
                  disabled={isExporting || myTimetable.length === 0}
                  className={isExporting ? 'opacity-50 cursor-not-allowed' : ''}
                  title="テキストファイルとして保存"
                >
                  {isExporting ? (
                    <div className="mr-2">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isExporting ? '保存中...' : 'テキスト'}
                </Button> */}
              </div>
            </div>
            
            {myTimetable.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                タイムテーブルからアーティストを選択してください
              </p>
            ) : (
              <>
                <Tabs value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(Number(v))} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    {[1, 2, 3].map(day => {
                      const dayCount = myTimetable
                        .map(id => timetableData?.performances.find(p => p.id === id))
                        .filter((p): p is Performance => p !== undefined && p.day === day).length;
                      
                      return (
                        <TabsTrigger
                          key={day}
                          value={day.toString()}
                          className="relative"
                        >
                          Day {day}
                          {dayCount > 0 && (
                            <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                              {dayCount}
                            </span>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
                
                <div id="my-timetable-content" className="mt-4">
                  {(() => {
                    const dayPerformances = myTimetable
                      .map(id => timetableData?.performances.find(p => p.id === id))
                      .filter((p): p is Performance => p !== undefined && p.day === selectedDay)
                      .sort((a, b) => {
                        const getTimeValue = (timeStr: string) => {
                          const [hour, minute] = timeStr.split(':').map(Number);
                          return hour >= 0 && hour < 6 ? (hour + 24) * 60 + minute : hour * 60 + minute;
                        };
                        return getTimeValue(a.start_time) - getTimeValue(b.start_time);
                      });
                    
                    if (dayPerformances.length === 0) {
                      return (
                        <p className="text-center text-muted-foreground py-8">
                          Day {selectedDay} に選択されたアーティストはありません
                        </p>
                      );
                    }
                    
                    // 総移動時間を計算（30分以内の移動のみ）
                    let totalWalkingTime = 0;
                    dayPerformances.forEach((performance, idx) => {
                      if (idx < dayPerformances.length - 1) {
                        const nextPerf = dayPerformances[idx + 1];
                        
                        // 次のアクトまでの時間を計算
                        const [endHour, endMin] = performance.end_time.split(':').map(Number);
                        const [nextStartHour, nextStartMin] = nextPerf.start_time.split(':').map(Number);
                        
                        // 分単位に変換（深夜時間の考慮）
                        const endMinutes = (endHour >= 0 && endHour < 6 ? endHour + 24 : endHour) * 60 + endMin;
                        const nextStartMinutes = (nextStartHour >= 0 && nextStartHour < 6 ? nextStartHour + 24 : nextStartHour) * 60 + nextStartMin;
                        const timeBetween = nextStartMinutes - endMinutes;
                        
                        // 60分以内の場合のみカウント
                        if (timeBetween <= 60) {
                          const walkingTime = parseInt(getWalkingTime(performance.stage, nextPerf.stage));
                          totalWalkingTime += walkingTime;
                        }
                      }
                    });
                    
                    return (
                      <div>
                        {totalWalkingTime > 0 && (
                          <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Day {selectedDay} の総移動時間</span>
                              <span className="text-lg font-bold text-primary">{totalWalkingTime}分</span>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                        {dayPerformances.map((performance, idx) => {
                          const conflicts = myTimetable.filter(otherId => {
                            if (otherId === performance.id) return false;
                            const otherPerf = timetableData?.performances.find(p => p.id === otherId);
                            return otherPerf && checkTimeConflict(performance, otherPerf);
                          });
                          
                          // 次のパフォーマンスとの移動時間
                          let movementInfo = null;
                          if (idx < dayPerformances.length - 1) {
                            const nextPerf = dayPerformances[idx + 1];
                            
                            // 次のアクトまでの時間を計算
                            const [endHour, endMin] = performance.end_time.split(':').map(Number);
                            const [nextStartHour, nextStartMin] = nextPerf.start_time.split(':').map(Number);
                            
                            // 分単位に変換（深夜時間の考慮）
                            const endMinutes = (endHour >= 0 && endHour < 6 ? endHour + 24 : endHour) * 60 + endMin;
                            const nextStartMinutes = (nextStartHour >= 0 && nextStartHour < 6 ? nextStartHour + 24 : nextStartHour) * 60 + nextStartMin;
                            const timeBetween = nextStartMinutes - endMinutes;
                            
                            // 0分後で同じステージの場合、または1分以上の場合に時間情報を表示
                            if (timeBetween >= 0) {
                              const isSameStage = performance.stage === nextPerf.stage;
                              
                              // 0分後の場合は特別表示
                              if (timeBetween === 0) {
                                if (isSameStage) {
                                  // 同じステージの場合
                                  movementInfo = (
                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                      <span className="font-bold">↓</span>
                                      <span className="text-xs text-muted-foreground">（連続）</span>
                                      <div className="flex items-center gap-2 text-blue-500 font-semibold">
                                        <span>同じステージ</span>
                                        <span>🏝️</span>
                                        <span className="text-xs">ゆっくりできるね〜</span>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // 別のステージの場合
                                  const walkingTime = getWalkingTime(performance.stage, nextPerf.stage);
                                  movementInfo = (
                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                      <span className="font-bold">↓</span>
                                      <span className="text-xs text-red-500 font-bold">（0分後）</span>
                                      <div className="flex items-center gap-2 text-red-500 font-bold">
                                        <span>🏃‍♂️💨</span>
                                        <span>急げ！</span>
                                        <span className="text-xs">（移動時間: {walkingTime}分）</span>
                                      </div>
                                    </div>
                                  );
                                }
                              } else if (timeBetween > 0) {
                                // 1分以上の場合は移動時間も表示（時間間隔に関わらず）
                                const walkingTime = getWalkingTime(performance.stage, nextPerf.stage);
                                
                                const isHardRoute = 
                                  (performance.stage === 'RED MARQUEE' && nextPerf.stage === 'FIELD OF HEAVEN') ||
                                  (performance.stage === 'FIELD OF HEAVEN' && nextPerf.stage === 'RED MARQUEE');
                                
                                const isMediumRoute = 
                                  (performance.stage === 'WHITE STAGE' && nextPerf.stage === 'RED MARQUEE') ||
                                  (performance.stage === 'RED MARQUEE' && nextPerf.stage === 'WHITE STAGE') ||
                                  (performance.stage === 'FIELD OF HEAVEN' && nextPerf.stage === 'GREEN STAGE') ||
                                  (performance.stage === 'GREEN STAGE' && nextPerf.stage === 'FIELD OF HEAVEN');
                                
                                const isNiceRoute = 
                                  (performance.stage === 'GREEN STAGE' && nextPerf.stage === 'WHITE STAGE') ||
                                  (performance.stage === 'WHITE STAGE' && nextPerf.stage === 'GREEN STAGE');
                                
                                const isEasyRoute = 
                                  (performance.stage === 'GREEN STAGE' && nextPerf.stage === 'RED MARQUEE') ||
                                  (performance.stage === 'RED MARQUEE' && nextPerf.stage === 'GREEN STAGE');
                                
                                const isNormalRoute = 
                                  (performance.stage === 'FIELD OF HEAVEN' && nextPerf.stage === 'WHITE STAGE') ||
                                  (performance.stage === 'WHITE STAGE' && nextPerf.stage === 'FIELD OF HEAVEN');
                                
                                movementInfo = (
                                  <div className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="font-bold">↓</span>
                                    <span className="text-xs text-muted-foreground">（{timeBetween}分後）</span>
                                    {isSameStage ? (
                                      <div className="flex items-center gap-2 text-blue-500 font-semibold">
                                        <span>同じステージ</span>
                                        <span>🏝️</span>
                                        <span className="text-xs">ゆっくり楽しめる〜</span>
                                      </div>
                                    ) : (
                                      <div className={`flex items-center gap-2 ${
                                        isHardRoute ? 'text-orange-600 font-semibold' : 
                                        isMediumRoute ? 'text-yellow-600 font-semibold' : 
                                        isNiceRoute ? 'text-green-600 font-semibold' :
                                        isEasyRoute ? 'text-blue-600 font-semibold' :
                                        isNormalRoute ? 'text-gray-600 font-medium' :
                                        'text-muted-foreground'
                                      }`}>
                                        <span>移動時間: {walkingTime}分</span>
                                        {isHardRoute && (
                                          <>
                                            <span className="text-orange-600">🥵</span>
                                            <span className="text-xs">きついぜぇ〜</span>
                                          </>
                                        )}
                                        {isMediumRoute && (
                                          <>
                                            <span className="text-yellow-600">😅</span>
                                            <span className="text-xs">まあまあきつい</span>
                                          </>
                                        )}
                                        {isNiceRoute && (
                                          <>
                                            <span className="text-green-600">🚶</span>
                                            <span className="text-xs">適度な運動だね！</span>
                                          </>
                                        )}
                                        {isEasyRoute && (
                                          <>
                                            <span className="text-blue-600">😎</span>
                                            <span className="text-xs">楽勝！</span>
                                          </>
                                        )}
                                        {isNormalRoute && (
                                          <>
                                            <span className="text-gray-600">🤷</span>
                                            <span className="text-xs">まあ普通</span>
                                          </>
                                        )}
                                        {parseInt(walkingTime) >= 15 && !isHardRoute && !isMediumRoute && (
                                          <span className="text-yellow-600">⚠️</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                          }
                          
                          return (
                            <div key={performance.id} className="space-y-1">
                              <Card className={`p-3 ${conflicts.length > 0 ? 'border-red-500 bg-red-50' : ''}`}>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">{performance.start_time} - {performance.end_time}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        STAGE_COLORS[performance.stage as keyof typeof STAGE_COLORS] || 'bg-gray-600'
                                      }`}>
                                        {performance.stage}
                                      </span>
                                    </div>
                                    <div className="font-bold text-lg mt-1">{performance.artist}</div>
                                    {conflicts.length > 0 && (
                                      <div className="text-red-600 text-sm mt-1">
                                        ⚠️ 時間が重複しています
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    onClick={() => toggleMyTimetable(performance.id)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </Card>
                              {movementInfo}
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
          )}
        </div>

      </div>
    </div>
  );
}