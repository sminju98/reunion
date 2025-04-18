import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { generateMessageSuggestions } from '../utils/gptService';

const AnalysisResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalysisResult = async () => {
      try {
        if (location.state?.analysisResult) {
          setAnalysisResult(location.state.analysisResult);
          setLoading(false);
          return;
        }

        const analysisId = location.state?.analysisId;
        if (!analysisId) {
          throw new Error('분석 결과를 찾을 수 없습니다.');
        }

        const analysisDoc = await getDoc(doc(db, 'analyses', analysisId));
        if (analysisDoc.exists()) {
          setAnalysisResult(analysisDoc.data().analysisResult);
        } else {
          throw new Error('분석 결과가 존재하지 않습니다.');
        }
      } catch (error) {
        console.error('분석 결과 로딩 오류:', error);
        setError('분석 결과를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisResult();
  }, [location]);

  const handleLogout = () => {
    signOut(auth);
  };

  const handleGoToMessages = () => {
    navigate('/message-recommendation', {
      state: {
        analysisResult,
        analysisId: location.state?.analysisId
      }
    });
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const userInitial = auth.currentUser?.email?.charAt(0).toUpperCase() || 'U';

  // 🛡️ 안전하게 상태 처리
  if (loading) {
    return <div className="loading">분석 결과를 불러오는 중입니다...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!analysisResult) {
    return <div className="error-message">분석 결과를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="result-container">
      <div className="result-header">
        <h1>리유니온(ReUnion)</h1>
        <div className="user-info">
          <div className="user-avatar">{userInitial}</div>
          <button onClick={handleLogout} className="logout-button">로그아웃</button>
        </div>
      </div>

      <div className="result-content">
        <div className="score-card">
          <div className="score-label">재회 가능성 점수</div>
          <div className="score-value">{analysisResult.reunionScore}</div>
          <div className="score-bar">
            <div className="score-fill" style={{ width: `${analysisResult.reunionScore}%` }}></div>
          </div>
          <div className="score-description">긍정적인 재회 가능성을 보입니다.</div>
        </div>

        <div className="analysis-section">
          <h3>분석 요약</h3>
          <p>{analysisResult.summary}</p>
        </div>

        <div className="analysis-section">
          <h3>주요 인사이트</h3>
          <ul className="insight-list">
            {Array.isArray(analysisResult.keyInsights) &&
              analysisResult.keyInsights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
          </ul>
        </div>

        <div className="action-button-container">
          <button onClick={handleGoToMessages} className="upload-button">
            메시지 추천 받기
          </button>
        </div>

        <div className="navigation-buttons">
          <button onClick={handleBackToDashboard} className="back-button">
            대시보드로 돌아가기
          </button>
        </div>
      </div>

      <div className="footer">
        © 2025 리유니온(ReUnion) | 모든 대화 데이터는 암호화되어 안전하게 보관됩니다
      </div>
    </div>
  );
};

export default AnalysisResult;
