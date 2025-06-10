'use client';

import React from 'react';

interface SkeletonLoaderProps {
  type: 'timetable' | 'map' | 'mytimetable';
}

export default function SkeletonLoader({ type }: SkeletonLoaderProps) {
  if (type === 'timetable') {
    return (
      <div className="animate-pulse">
        {/* ステージヘッダー */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
        
        {/* タイムラインスケルトン */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex gap-2">
              <div className="w-20 h-16 bg-muted rounded"></div>
              <div className="flex-1 grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-16 bg-muted rounded" style={{
                    opacity: Math.random() > 0.5 ? 1 : 0
                  }}></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'map') {
    return (
      <div className="h-[300px] sm:h-[400px] lg:h-[500px] bg-muted rounded animate-pulse relative overflow-hidden">
        {/* 地図の背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20"></div>
        
        {/* ステージマーカーのスケルトン */}
        <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-muted-foreground/30 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-12 h-12 bg-muted-foreground/20 rounded-full animate-pulse delay-75"></div>
        <div className="absolute bottom-1/4 left-1/3 w-14 h-14 bg-muted-foreground/25 rounded-full animate-pulse delay-150"></div>
        <div className="absolute bottom-1/3 right-1/4 w-10 h-10 bg-muted-foreground/15 rounded-full animate-pulse delay-300"></div>
        
        {/* ローディングテキスト */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold text-muted-foreground animate-pulse">
              会場マップを準備中...
            </div>
            <div className="text-sm text-muted-foreground/70 mt-2">
              ステージ位置を確認しています
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'mytimetable') {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-6 w-48 bg-muted rounded"></div>
              </div>
              <div className="h-8 w-8 bg-muted rounded"></div>
            </div>
            <div className="h-3 w-24 bg-muted rounded mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}