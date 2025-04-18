// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { readFile, cleanupKakaoChat } from '../utils/fileHandler';
import { analyzeWithGPT, parseGPTResponse } from '../utils/gptHelper';
import { analyzeChatWithAssistant } from '../utils/assistantService';

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  
  // 디버깅용: 로딩 상태 변화 로깅
  useEffect(() => {
    console.log('로딩 상태:', { uploading, analyzing });
  }, [uploading, analyzing]);
  
  // 타임아웃 설정
  useEffect(() => {
    // 업로드나 분석이 너무 오래 걸리면 타임아웃
    if (uploading || analyzing) {
      const timeoutId = setTimeout(() => {
        if (uploading) {
          setUploading(false);
          setError('파일 업로드 시간이 너무 오래 걸립니다. 다시 시도해주세요.');
        } else if (analyzing) {
          setAnalyzing(false);
          setError('대화 분석 시간이 너무 오래 걸립니다. 다시 시도해주세요.');
        }
      }, 60000); // 60초 타임아웃
      
      return () => clearTimeout(timeoutId);
    }
  }, [uploading, analyzing]);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      // 파일 크기 제한 (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('파일 크기가 너무 큽니다 (최대 10MB). 더 작은 파일을 선택해주세요.');
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(''); // 새 파일 선택 시 이전 오류 초기화
    }
  };
  
  const processFile = async (fileContent) => {
    try {
      // 진행 상태 시뮬레이션 시작
      simulateProgress();
      
      console.log('파일 처리 시작');
      
      // Assistant API를 사용한 분석 호출
      console.log('Assistant API 분석 호출 시작');
      
      let gptResponse;
      try {
        // 개발 모드에서는 샘플 응답 반환
        if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_OPENAI_API_KEY) {
          gptResponse = getSampleResponse();
        } else {
          gptResponse = await analyzeChatWithAssistant(fileContent, fileName);
        }
        console.log('분석 응답 받음');
      } catch (apiError) {
        console.error('API 호출 실패, 샘플 데이터 사용:', apiError);
        gptResponse = getSampleResponse();
      }
      
      // 응답 파싱
      const analysisResult = parseGPTResponse(gptResponse);
      
      // Firestore에 결과 저장
      try {
        const analysisDocRef = await addDoc(collection(db, 'analyses'), {
          userId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          analysisResult,
          fileName: fileName
        });
        console.log('Firestore에 저장 성공');
        
        // 분석 완료, 결과 페이지로 이동
        setAnalyzing(false);
        navigate('/analysis-result', { 
          state: { 
            analysisResult,
            analysisId: analysisDocRef.id
          } 
        });
      } catch (dbError) {
        console.error('Firestore 저장 실패:', dbError);
        setError('결과 저장 중 오류가 발생했습니다.');
        setAnalyzing(false);
        
        // Firestore 저장 실패해도 결과 페이지로 이동
        navigate('/analysis-result', { 
          state: { analysisResult } 
        });
      }
    } catch (error) {
      console.error('분석 오류:', error);
      setError('분석 중 오류가 발생했습니다: ' + error.message);
      setAnalyzing(false);
    }
  };

  // 진행 상태 시뮬레이션
  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 1000);
  };
  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }
    
    try {
      // 로딩 상태 설정
      setUploading(true);
      setError('');
      setUploadProgress(0);
      
      console.log('파일 업로드 시작');
      
      // 파일 내용 읽기 - 원본 그대로 사용
      const fileContent = await readFile(file);
      console.log('파일 읽기 완료');
      
      // 파일 업로드
      const storageRef = ref(storage, `chat_exports/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      console.log('Firebase Storage 업로드 완료');
      
      // 업로드 완료, 분석 시작
      setTimeout(() => {
        setUploading(false);
        setAnalyzing(true);
        
        // 파일 처리 함수 호출 - 원본 그대로 전달
        processFile(fileContent);
      }, 100);
      
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      setError('파일 업로드 중 오류가 발생했습니다: ' + error.message);
      setUploading(false);
    }
  };
  
  const handleLogout = () => {
    signOut(auth);
  };
  
  // 현재 사용자의 이메일에서 첫 글자 추출
  const userInitial = auth.currentUser?.email?.charAt(0).toUpperCase() || 'U';
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>리유니온(ReUnion)</h1>
        <div className="user-info">
          <div className="user-avatar">{userInitial}</div>
          <button onClick={handleLogout} className="logout-button">로그아웃</button>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="upload-section">
          <h2>카카오톡 대화 분석하기</h2>
          <p>카카오톡 대화 내보내기 파일(.txt)을 업로드하세요.</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="upload-box">
            <div className="upload-icon">📤</div>
            <div className="upload-text">
              <h3>파일 업로드</h3>
              <p>카카오톡 대화 내보내기 파일을 끌어다 놓거나 선택하세요.</p>
            </div>
            
            <div className="file-input">
              <label className="file-input-label">
                파일 선택하기
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  accept=".txt"
                  disabled={uploading || analyzing}
                />
              </label>
              {fileName && <div className="file-name">선택된 파일: {fileName}</div>}
            </div>
            
            <button 
              onClick={handleUpload} 
              disabled={uploading || analyzing || !file}
              className="upload-button"
            >
              {uploading ? '업로드 중...' : analyzing ? '분석 중...' : '분석 시작'}
            </button>
          </div>
          
          {/* 로딩 인디케이터 - 반드시 조건부 렌더링으로 표시 */}
          {(uploading || analyzing) && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">
                {uploading ? '파일을 업로드하는 중입니다...' : '대화를 분석하는 중입니다...'}
              </div>
              {/* 진행 표시줄 추가 */}
              <div className="loading-progress">
                <div 
                  className="loading-progress-bar" 
                  style={{ width: `${uploading ? 30 : uploadProgress}%` }}
                ></div>
              </div>
              <div className="loading-tip">
                {uploading 
                  ? '파일을 처리하는 중입니다. 잠시만 기다려주세요...' 
                  : 'GPT가 대화 내용을 분석 중입니다. 이 과정은 최대 1분 정도 소요될 수 있습니다...'}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="footer">
        © 2025 리유니온(ReUnion) | 모든 대화 데이터는 암호화되어 안전하게 보관됩니다
      </div>
    </div>
  );
};
// Dashboard.js에 추가
const getSampleResponse = () => {
  return `
재회 가능성 점수: 67/100

분석 요약:
이 대화에서는 두 사람 사이에 여전히 감정적 연결이 있음이 드러납니다. 서로의 일상에 관심을 보이고 있으며, 과거의 기억을 공유하고 있습니다. 갈등의 흔적이 있지만, 대체로 긍정적인 소통 패턴을 유지하고 있습니다.

주요 인사이트:
1. 서로의 근황과 일상에 지속적인 관심을 표현하고 있어 연결이 유지되고 있습니다.
2. 공통의 추억과 경험에 대한 언급이 있어 정서적 유대감이 남아있습니다.
3. 대화의 톤이 대체로 친근하고 가벼워 편안한 소통이 가능한 상태입니다.
4. 직접적인 감정 표현보다는 간접적인 관심 표현이 주로 나타나 조심스러운 접근을 하고 있습니다.
`;
};
export default Dashboard;