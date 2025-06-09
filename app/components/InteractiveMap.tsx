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

interface InteractiveMapProps {
  myTimetable: string[];
  timetableData: TimetableData | null;
  selectedDay: number;
}

export default function InteractiveMap({ myTimetable, timetableData, selectedDay }: InteractiveMapProps) {
  const [map, setMap] = useState<any>(null);
  const [L, setL] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
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
        }

        // アイコンの修正
        delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
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
  }, []);

  useEffect(() => {
    if (!isLoaded || !L || map) return;

    // マップの初期化
    const mapInstance = L.map('map-container').setView([36.8480, 138.7025], 16);

    // タイルレイヤーの追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    setMap(mapInstance);

    // クリーンアップ
    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [isLoaded, L]);

  useEffect(() => {
    if (!map || !L || !timetableData) return;

    // 既存のマーカーとポリラインをクリア
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const selectedPerformances = myTimetable
      .map(id => timetableData.performances.find(p => p.id === id))
      .filter((p): p is Performance => p !== undefined && p.day === selectedDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

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
      const hasPerformance = selectedPerformances.some(p => p.stage === stage.name);
      const performanceNumbers = stagePerformances[stage.name]?.join(',');

      const icon = L.divIcon({
        html: `
          <div style="
            background-color: ${hasPerformance ? '#ffcc00' : stage.color};
            color: ${stage.color === '#ffffff' ? '#000' : '#fff'};
            border: 3px solid ${hasPerformance ? '#ff6b35' : '#fff'};
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ">
            ${stage.name.split(' ')[0]}
          </div>
        `,
        className: 'custom-stage-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([stage.lat, stage.lng], { icon }).addTo(map);

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
    });

    // 個別のパフォーマンスマーカーを追加（時系列順で位置をずらす）
    selectedPerformances.forEach((perf, index) => {
      const stage = STAGE_POSITIONS.find(s => s.name === perf.stage);
      if (!stage) return;

      // 各ステージの周囲に円形配置するための角度計算
      const stagePerfs = selectedPerformances.filter(p => p.stage === perf.stage);
      const stageIndex = stagePerfs.findIndex(p => p.id === perf.id);
      const totalStagePerfs = stagePerfs.length;
      
      // 円形配置のための座標オフセット
      const radius = 0.0002; // 約20m
      const angle = (stageIndex * 2 * Math.PI) / Math.max(totalStagePerfs, 4);
      const offsetLat = radius * Math.cos(angle);
      const offsetLng = radius * Math.sin(angle);

      const perfIcon = L.divIcon({
        html: `
          <div style="
            background-color: #ff6b35;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ">
            ${index + 1}
          </div>
        `,
        className: 'performance-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const perfMarker = L.marker([stage.lat + offsetLat, stage.lng + offsetLng], { icon: perfIcon }).addTo(map);
      
      perfMarker.bindPopup(`
        <div class="text-center">
          <h4 class="font-bold text-sm">${index + 1}. ${perf.artist}</h4>
          <p class="text-xs">${perf.start_time} - ${perf.end_time}</p>
          <p class="text-xs">${perf.stage}</p>
        </div>
      `);
    });

    // 移動経路を追加（個別パフォーマンスマーカーの位置を使用）
    if (selectedPerformances.length > 1) {
      const path: [number, number][] = [];
      selectedPerformances.forEach((perf, index) => {
        const stage = STAGE_POSITIONS.find(s => s.name === perf.stage);
        if (!stage) return;

        // 同じロジックでオフセット座標を計算
        const stagePerfs = selectedPerformances.filter(p => p.stage === perf.stage);
        const stageIndex = stagePerfs.findIndex(p => p.id === perf.id);
        const totalStagePerfs = stagePerfs.length;
        
        const radius = 0.0002;
        const angle = (stageIndex * 2 * Math.PI) / Math.max(totalStagePerfs, 4);
        const offsetLat = radius * Math.cos(angle);
        const offsetLng = radius * Math.sin(angle);

        path.push([stage.lat + offsetLat, stage.lng + offsetLng]);
      });

      if (path.length > 1) {
        L.polyline(path, {
          color: '#ffcc00',
          weight: 3,
          opacity: 0.8,
          dashArray: '8, 4'
        }).addTo(map);
      }
    }
  }, [map, L, myTimetable, timetableData, selectedDay]);

  if (!isLoaded) {
    return (
      <div className="h-[500px] border border-border rounded overflow-hidden flex items-center justify-center">
        <p className="text-muted-foreground">マップを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] border border-border rounded overflow-hidden">
      <div id="map-container" style={{ height: '100%', width: '100%' }} />
    </div>
  );
}