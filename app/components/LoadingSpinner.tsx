'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* 外側の円 - 山のシルエットをイメージ */}
        <div className={`${sizeClasses[size]} relative animate-spin`}>
          <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent"></div>
        </div>
        
        {/* 内側のパルスアニメーション - 音楽の振動をイメージ */}
        <div className={`absolute inset-0 flex items-center justify-center`}>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* ローディングメッセージ */}
      {message && (
        <div className={`${textSizes[size]} text-muted-foreground animate-pulse`}>
          {message}
        </div>
      )}
    </div>
  );
}