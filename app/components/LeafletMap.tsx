'use client';

import React, { useEffect, useState } from 'react';
import { Performance, TimetableData } from '../types';

interface StagePosition {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
}

// FUJI ROCK FESTIVAL'25 苗場スキー場の実際の座標
const STAGE_POSITIONS: StagePosition[] = [
  { id: 'green', name: 'GREEN STAGE', lat: 36.8475, lng: 138.7025, color: '#10b981' },
  { id: 'white', name: 'WHITE STAGE', lat: 36.8485, lng: 138.7035, color: '#ffffff' },
  { id: 'red', name: 'RED MARQUEE', lat: 36.8470, lng: 138.7015, color: '#ef4444' },
  { id: 'heaven', name: 'FIELD OF HEAVEN', lat: 36.8490, lng: 138.7030, color: '#3b82f6' },
  { id: 'oasis', name: 'OASIS', lat: 36.8475, lng: 138.7020, color: '#00bcd4' }
];

interface LeafletMapProps {
  myTimetable: string[];
  timetableData: TimetableData | null;
  selectedDay: number;
}

export default function LeafletMap({ myTimetable, timetableData, selectedDay }: LeafletMapProps) {
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
  const [map, setMap] = useState<L.Map | null>(null);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const loadLeaflet = async () => {
      try {
        // Leafletを動的インポート
        const leaflet = await import('leaflet');
        
        // CSSを動的に読み込み
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);

          // CSSの読み込み完了を待つ
          await new Promise(resolve => {
            link.onload = resolve;
            setTimeout(resolve, 1000); // タイムアウト
          });
        }

        // アイコンの修正
        delete (leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setL(leaflet);
        setIsLoaded(true);
      } catch (error) {
        console.error('Leaflet loading failed:', error);
      }
    };

    loadLeaflet();
  }, [isMounted]);

  useEffect(() => {
    if (!isLoaded || !L || map || !isMounted) return;

    // DOM要素の存在確認とタイミング調整
    const initMap = () => {
      const mapContainer = document.getElementById('leaflet-map-container');
      if (!mapContainer) {
        setTimeout(initMap, 100);
        return;
      }

      try {
        // マップの初期化
        const mapInstance = L.map(mapContainer).setView([36.8480, 138.7025], 16);

        // タイルレイヤーの追加
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance);

        setMap(mapInstance);
      } catch (error) {
        console.error('Map initialization failed:', error);
      }
    };

    initMap();

    // クリーンアップ
    return () => {
      // mapInstanceを直接参照してクリーンアップ
    };
  }, [isLoaded, L, isMounted, map]);

  useEffect(() => {
    if (!map || !L || !timetableData || !isMounted) return;

    // 既存のマーカーとポリラインをクリア
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const selectedPerformances = myTimetable
      .map(id => timetableData.performances.find(p => p.id === id))
      .filter((p): p is Performance => {
        if (!p) return false;
        
        // 選択された日のパフォーマンス
        if (p.day === selectedDay) return true;
        
        // 翌日の深夜パフォーマンス（0-5時）を前日の延長として含める
        if (p.day === selectedDay + 1) {
          const [hour] = p.start_time.split(':').map(Number);
          return hour >= 0 && hour < 6;
        }
        
        return false;
      })
      .sort((a, b) => {
        // 時間を数値に変換（深夜時間0-5時は24+時間として扱う）
        const getTimeValue = (timeStr: string) => {
          const [hour, minute] = timeStr.split(':').map(Number);
          return hour >= 0 && hour < 6 ? (hour + 24) * 60 + minute : hour * 60 + minute;
        };
        
        return getTimeValue(a.start_time) - getTimeValue(b.start_time);
      });

    // パフォーマンスをステージ別にグループ化
    const stagePerformances: Record<string, number[]> = {};
    selectedPerformances.forEach((perf, idx) => {
      if (!stagePerformances[perf.stage]) {
        stagePerformances[perf.stage] = [];
      }
      stagePerformances[perf.stage].push(idx + 1);
    });

    // ステージマーカーを追加（メインステージ）
    STAGE_POSITIONS.filter(s => s.id !== 'oasis').forEach(stage => {
      const stagePerfs = selectedPerformances.filter(p => p.stage === stage.name);
      const hasPerformance = stagePerfs.length > 0;
      const performanceNumbers = stagePerfs.map(p => selectedPerformances.indexOf(p) + 1);

      const icon = L.divIcon({
        html: `
          <div style="
            position: relative;
            background-color: ${hasPerformance ? '#ff6b35' : stage.color};
            color: ${stage.color === '#ffffff' && !hasPerformance ? '#000' : '#fff'};
            border: 4px solid ${hasPerformance ? '#ffcc00' : '#fff'};
            border-radius: 12px;
            width: ${hasPerformance ? '80px' : '60px'};
            height: ${hasPerformance ? '60px' : '50px'};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: ${hasPerformance ? '14px' : '12px'};
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
          ">
            <div style="font-size: 14px;">${stage.name.split(' ')[0]}</div>
            ${hasPerformance ? `<div style="font-size: 18px; font-weight: 900; margin-top: 2px;">${performanceNumbers.join(',')}</div>` : ''}
          </div>
        `,
        className: 'custom-stage-marker',
        iconSize: hasPerformance ? [80, 60] : [60, 50],
        iconAnchor: hasPerformance ? [40, 30] : [30, 25]
      });

      const marker = L.marker([stage.lat, stage.lng], { icon });
      try {
        marker.addTo(map);
        
        // ポップアップの内容
        let popupContent = `<div class="text-center"><h4 class="font-bold">${stage.name}</h4>`;
        if (hasPerformance) {
          popupContent += '<div class="mt-2"><p class="text-sm font-semibold">選択中のパフォーマンス:</p>';
          selectedPerformances
            .filter(p => p.stage === stage.name)
            .forEach(perf => {
              popupContent += `<p class="text-xs">${perf.start_time} ${perf.artist}</p>`;
            });
          popupContent += '</div>';
        }
        popupContent += '</div>';

        marker.bindPopup(popupContent);
      } catch (error) {
        console.error('Marker add failed:', error);
      }
    });

    // パフォーマンスの時間情報をステージの近くに表示
    selectedPerformances.forEach((perf, index) => {
      const stage = STAGE_POSITIONS.find(s => s.name === perf.stage);
      if (!stage) return;

      // ステージの下に時間情報を配置
      const offset = 0.0001 + (index * 0.00003); // 約10m + 番号ごとに3m
      
      const timeIcon = L.divIcon({
        html: `
          <div style="
            background-color: rgba(255, 255, 255, 0.95);
            color: #333;
            border: 2px solid #ff6b35;
            border-radius: 8px;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            <span style="color: #ff6b35; font-size: 14px;">${index + 1}</span>
            <span style="margin: 0 4px;">|</span>
            ${perf.start_time}
          </div>
        `,
        className: 'time-marker',
        iconSize: [100, 30],
        iconAnchor: [50, -5] // ステージマーカーの上に配置
      });

      const timeMarker = L.marker([stage.lat - offset, stage.lng], { icon: timeIcon });
      try {
        timeMarker.addTo(map);
        
        timeMarker.bindPopup(`
          <div class="text-center">
            <h4 class="font-bold text-sm">${index + 1}. ${perf.artist}</h4>
            <p class="text-xs">${perf.start_time} - ${perf.end_time}</p>
            <p class="text-xs">${perf.stage}</p>
          </div>
        `);
      } catch (error) {
        console.error('Time marker add failed:', error);
        return;
      }
    });

    // 移動経路を追加（移動時間を含む）
    if (selectedPerformances.length > 1) {
      selectedPerformances.forEach((perf, index) => {
        if (index === selectedPerformances.length - 1) return;
        
        const currentStage = STAGE_POSITIONS.find(s => s.name === perf.stage);
        const nextPerf = selectedPerformances[index + 1];
        const nextStage = STAGE_POSITIONS.find(s => s.name === nextPerf.stage);
        
        if (!currentStage || !nextStage) return;
        
        // 移動時間を取得
        const walkingTime = getWalkingTime(perf.stage, nextPerf.stage);
        const isSameStage = perf.stage === nextPerf.stage;
        const isHardRoute = 
          (perf.stage === 'RED MARQUEE' && nextPerf.stage === 'FIELD OF HEAVEN') ||
          (perf.stage === 'FIELD OF HEAVEN' && nextPerf.stage === 'RED MARQUEE');
        const isMediumRoute = 
          (perf.stage === 'WHITE STAGE' && nextPerf.stage === 'RED MARQUEE') ||
          (perf.stage === 'RED MARQUEE' && nextPerf.stage === 'WHITE STAGE') ||
          (perf.stage === 'FIELD OF HEAVEN' && nextPerf.stage === 'GREEN STAGE') ||
          (perf.stage === 'GREEN STAGE' && nextPerf.stage === 'FIELD OF HEAVEN');
        const isNiceRoute = 
          (perf.stage === 'GREEN STAGE' && nextPerf.stage === 'WHITE STAGE') ||
          (perf.stage === 'WHITE STAGE' && nextPerf.stage === 'GREEN STAGE');
        const isEasyRoute = 
          (perf.stage === 'GREEN STAGE' && nextPerf.stage === 'RED MARQUEE') ||
          (perf.stage === 'RED MARQUEE' && nextPerf.stage === 'GREEN STAGE');
        
        // 異なるステージ間の移動のみ線を引く
        if (!isSameStage) {
          const path: [number, number][] = [
            [currentStage.lat, currentStage.lng],
            [nextStage.lat, nextStage.lng]
          ];
          
          const polyline = L.polyline(path, {
            color: isHardRoute ? '#dc2626' : isMediumRoute ? '#f59e0b' : isNiceRoute ? '#16a34a' : isEasyRoute ? '#2563eb' : '#ff6b35',
            weight: isHardRoute ? 6 : isMediumRoute ? 5 : isNiceRoute ? 4 : isEasyRoute ? 3 : 4,
            opacity: isHardRoute ? 0.8 : isMediumRoute ? 0.7 : isNiceRoute ? 0.8 : isEasyRoute ? 0.8 : 0.6,
            dashArray: isHardRoute ? '5, 10' : isMediumRoute ? '8, 8' : isNiceRoute ? '15, 5' : isEasyRoute ? '20, 3' : '10, 5'
          });
          
          try {
            polyline.addTo(map);
            
            // 線の中央に移動時間を表示
            const midLat = (currentStage.lat + nextStage.lat) / 2;
            const midLng = (currentStage.lng + nextStage.lng) / 2;
            
            const walkingIcon = L.divIcon({
              html: `
                <div style="
                  background-color: ${isHardRoute ? '#fef3c7' : isMediumRoute ? '#fef3c7' : isNiceRoute ? '#dcfce7' : isEasyRoute ? '#dbeafe' : '#fff'};
                  color: ${isHardRoute ? '#dc2626' : isMediumRoute ? '#f59e0b' : isNiceRoute ? '#16a34a' : isEasyRoute ? '#2563eb' : '#ff6b35'};
                  border: 2px solid ${isHardRoute ? '#dc2626' : isMediumRoute ? '#f59e0b' : isNiceRoute ? '#16a34a' : isEasyRoute ? '#2563eb' : '#ff6b35'};
                  border-radius: 12px;
                  padding: 4px 8px;
                  font-size: 12px;
                  font-weight: bold;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                ">
                  → ${walkingTime}分${isHardRoute ? ' 🥵' : isMediumRoute ? ' 😅' : isNiceRoute ? ' 🚶' : isEasyRoute ? ' 😎' : ''}
                </div>
              `,
              className: 'walking-time-marker',
              iconSize: isHardRoute || isMediumRoute || isNiceRoute || isEasyRoute ? [90, 30] : [70, 30],
              iconAnchor: isHardRoute || isMediumRoute || isNiceRoute || isEasyRoute ? [45, 15] : [35, 15]
            });
            
            L.marker([midLat, midLng], { icon: walkingIcon }).addTo(map);
          } catch (error) {
            console.error('Path add failed:', error);
          }
        }
      });
    }
  }, [map, L, myTimetable, timetableData, selectedDay, isMounted, getWalkingTime]);

  if (!isMounted) {
    return (
      <div className="h-[300px] sm:h-[400px] lg:h-[500px] border border-border rounded overflow-hidden flex items-center justify-center">
        <p className="text-muted-foreground">初期化中...</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[300px] sm:h-[400px] lg:h-[500px] border border-border rounded overflow-hidden flex items-center justify-center">
        <p className="text-muted-foreground">マップを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] sm:h-[400px] lg:h-[500px] border border-border rounded overflow-hidden">
      <div id="leaflet-map-container" style={{ height: '100%', width: '100%' }} />
    </div>
  );
}