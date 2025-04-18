// src/components/LoadingIndicator.js
import React, { useState, useEffect } from 'react';

const LoadingIndicator = ({ message, tips }) => {
  const [progress, setProgress] = useState(10);
  const [currentTip, setCurrentTip] = useState(0);
  
  // 진행 상태 시뮬레이션
  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress < 90) {
        setProgress(prevProgress => {
          // 점점 느려지는 진행 상태 (사실적인 느낌을 주기 위해)
          const increment = Math.max(1, 10 - Math.floor(prevProgress / 10));
          return prevProgress + increment;
        });
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, [progress]);
  
  // 팁 순환
  useEffect(() => {
    if (!tips || tips.length <= 1) return;
    
    const tipTimer = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 5000);
    
    return () => clearInterval(tipTimer);
  }, [tips]);
  
  // 기본 팁 목록
  const defaultTips = [
    "분석에는 약간의 시간이 필요합니다...",
    "GPT가 대화 내용을 해석하고 있습니다...",
    "재회 가능성 점수를 계산 중입니다...",
    "맞춤형 메시지를 생성하고 있습니다..."
  ];
  
  // 사용할 팁 목록
  const tipsToShow = tips && tips.length > 0 ? tips : defaultTips;
  
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <div className="loading-text">{message || '로딩 중입니다...'}</div>
      <div className="loading-progress">
        <div 
          className="loading-progress-bar" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="loading-tip">
        {tipsToShow[currentTip]}
      </div>
    </div>
  );
};

export default LoadingIndicator;