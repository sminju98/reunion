import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AnalysisResult from './pages/AnalysisResult';
import MessageRecommendation from './pages/MessageRecommendation';
import LoadingIndicator from './components/LoadingIndicator';
import ErrorDisplay from './components/ErrorDisplay';
import './styles/App.css';
// src/App.js의 import 부분에 추가

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 인증 상태 감지
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/analysis-result" element={user ? <AnalysisResult /> : <Navigate to="/login" />} />
        <Route path="/message-recommendation" element={user ? <MessageRecommendation /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;