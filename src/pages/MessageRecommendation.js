// src/pages/MessageRecommendation.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { generateMessageSuggestions } from '../utils/gptService';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorDisplay from '../components/ErrorDisplay';

const MessageRecommendation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestedMessages, setSuggestedMessages] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showSampleMessages, setShowSampleMessages] = useState(false);
  
  // 분석 ID와 결과를 저장할 상태
  const [analysisId, setAnalysisId] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // 로딩 팁 메시지
  const loadingTips = [
    "GPT가 대화 맥락을 분석하고 있습니다...",
    "상대방의 감정과 의도를 파악하고 있습니다...",
    "효과적인 대화 전략을 계산하고 있습니다...",
    "맞춤형 메시지 톤을 설정하는 중입니다...",
    "다양한 대화 스타일을 생성하고 있습니다..."
  ];
  
  // 샘플 메시지 데이터
  const sampleMessages = [
    {
      tone: "친근하고 일상적인 톤",
      content: "요즘 어떻게 지내? 나는 요새 새로운 프로젝트 시작했는데 생각보다 재밌더라고. 너도 잘 지내고 있지? 가끔 연락해도 될까?"
    },
    {
      tone: "진지하고 감성적인 톤",
      content: "최근에 많이 생각했어. 우리가 서로에게 의미있는 시간을 함께 보냈다고 생각해. 언젠가 편하게 커피라도 마실 수 있으면 좋겠다. 어떻게 지내?"
    },
    {
      tone: "가볍고 유머러스한 톤",
      content: "야, 그 유명한 카페 드디어 가봤어! 기억나? 우리가 항상 가보고 싶었던 곳! 사진 찍었는데 나중에 보여줄게. 근데 솔직히 너무 비싸더라고 ㅋㅋㅋ 요즘 어때?"
    }
  ];
  
  // 메시지 가져오기 함수 - useCallback을 사용하여 재시도 기능에서 재사용 가능하게 함
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setShowSampleMessages(false);
      
      // location.state가 없거나 analysisResult가 없는 경우 체크
      if (!location.state || !location.state.analysisResult) {
        console.error('분석 결과를 찾을 수 없습니다');
        setShowSampleMessages(true);
        setLoading(false);
        return;
      }
      
      // 분석 결과 저장
      setAnalysisResult(location.state.analysisResult);
      
      // 분석 ID가 있는지 확인
      const id = location.state.analysisId;
      if (!id) {
        console.log('분석 ID가 없습니다. 샘플 메시지를 사용합니다.');
        setShowSampleMessages(true);
        setLoading(false);
        return;
      }
      
      setAnalysisId(id);
      
      try {
        // Firestore에서 문서 가져오기
        const analysisDoc = await getDoc(doc(db, 'analyses', id));
        
        if (!analysisDoc.exists()) {
          throw new Error('분석 결과가 존재하지 않습니다.');
        }
        
        // 문서에 이미 메시지 추천이 있는지 확인
        const data = analysisDoc.data();
        
        if (data.suggestedMessages) {
          // 이미 메시지 추천이 있으면 그것을 사용
          setSuggestedMessages(data.suggestedMessages);
        } else {
          // 없으면 GPT를 호출하여 새로 생성
          try {
            const messages = await generateMessageSuggestions(
              "", // 실제 구현에서는 대화 내용 필요
              location.state.analysisResult
            );
            
            // 결과 저장
            setSuggestedMessages(messages);
            
            // Firestore에 저장
            try {
              await updateDoc(doc(db, 'analyses', id), {
                suggestedMessages: messages
              });
              console.log('메시지 추천 결과가 Firestore에 저장되었습니다.');
            } catch (storageError) {
              console.error('Firestore 저장 실패:', storageError);
            }
          } catch (apiError) {
            console.error('메시지 생성 API 오류:', apiError);
            setShowSampleMessages(true);
          }
        }
      } catch (dbError) {
        console.error('Firestore 데이터 로딩 오류:', dbError);
        setShowSampleMessages(true);
      }
    } catch (error) {
      console.error('메시지 추천 로딩 오류:', error);
      setError('메시지 추천을 불러오는 중 오류가 발생했습니다.');
      setShowSampleMessages(true);
    } finally {
      setLoading(false);
    }
  }, [location]);
  
  // 백업 타이머: 너무 오래 걸리면 샘플 메시지 보여주기
  useEffect(() => {
    const backupTimer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setShowSampleMessages(true);
        setError('응답 시간이 너무 깁니다. 샘플 메시지를 표시합니다.');
      }
    }, 30000);  // 30초 후 타임아웃
    
    return () => clearTimeout(backupTimer);
  }, [loading]);
  
  // 페이지 로드 시 메시지 가져오기
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);
  
  // 메시지 복사 함수
  const handleCopy = (index) => {
    const messagesToUse = showSampleMessages ? sampleMessages : suggestedMessages;
    if (messagesToUse && messagesToUse[index]) {
      navigator.clipboard.writeText(messagesToUse[index].content);
      setCopiedIndex(index);
      
      // 3초 후 복사 상태 초기화
      setTimeout(() => {
        setCopiedIndex(null);
      }, 3000);
    }
  };
  
  // 로그아웃 함수
  const handleLogout = () => {
    signOut(auth);
  };
  
  // 분석 결과로 돌아가기 함수
  const handleBackToAnalysis = () => {
    navigate('/analysis-result', { 
      state: { 
        analysisResult,
        analysisId
      } 
    });
  };
  
  // 재시도 함수
  const handleRetry = () => {
    fetchMessages();
  };
  
  // 현재 사용자의 이메일에서 첫 글자 추출
  const userInitial = auth.currentUser?.email?.charAt(0).toUpperCase() || 'U';
  
  // 표시할 메시지 결정
  const messagesToDisplay = showSampleMessages ? sampleMessages : suggestedMessages;
  
  return (
    <div className="messages-container">
      <div className="messages-header">
        <h1>리유니온(ReUnion)</h1>
        <div className="user-info">
          <div className="user-avatar">{userInitial}</div>
          <button onClick={handleLogout} className="logout-button">로그아웃</button>
        </div>
      </div>
      
      <div className="messages-content">
        <h2>추천 메시지</h2>
        <p>분석을 바탕으로 준비한 맞춤 메시지입니다. 상황에 맞게 선택하세요.</p>
        
        {/* 에러 메시지 표시 */}
        {error && (
          <ErrorDisplay 
            title="메시지 생성 중 문제가 발생했습니다" 
            message={error}
            onRetry={handleRetry}
          />
        )}
        
        {/* 로딩 인디케이터 */}
        {loading ? (
          <LoadingIndicator 
            message="맞춤형 메시지를 생성하고 있습니다..." 
            tips={loadingTips}
          />
        ) : (
          /* 메시지 목록 */
          <div className="message-list">
            {messagesToDisplay && messagesToDisplay.length > 0 ? (
              messagesToDisplay.map((message, index) => (
                <div key={index} className="message-card">
                  <div className="message-tone">{message.tone}</div>
                  <div className="message-content">{message.content}</div>
                  <div className="message-actions">
                    <button 
                      className="copy-button"
                      onClick={() => handleCopy(index)}
                    >
                      {copiedIndex === index ? "복사됨!" : "복사하기"}
                    </button>
                    <button className="edit-button">수정하기</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-messages">
                메시지 추천을 불러올 수 없습니다. 다시 시도해 주세요.
              </div>
            )}
            
            {/* 샘플 메시지인 경우 안내 표시 */}
            {showSampleMessages && (
              <div className="sample-message-notice">
                ※ 위의 메시지는 샘플입니다. 실제 분석 결과를 반영하지 않습니다.
              </div>
            )}
          </div>
        )}
        
        <div className="navigation-buttons">
          <button onClick={handleBackToAnalysis} className="back-button">분석 결과로 돌아가기</button>
        </div>
      </div>
      
      <div className="footer">
        © 2025 리유니온(ReUnion) | 모든 대화 데이터는 암호화되어 안전하게 보관됩니다
      </div>
    </div>
  );
};

export default MessageRecommendation;