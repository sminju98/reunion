import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
      console.error(error);
    }
  };
  
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setError('Google 로그인에 실패했습니다.');
      console.error(error);
    }
  };
  
  return (
    <div className="login-container">
      <h1>리유니온(ReUnion)</h1>
      <h2>카카오톡 대화 분석으로 재회 가능성을 진단하세요</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleLogin} className="login-form">
        <div className="form-group">
          <label>이메일</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>비밀번호</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-button">로그인</button>
      </form>
      
      <div className="social-login">
        <button onClick={handleGoogleLogin} className="google-login">
          Google 계정으로 로그인
        </button>
        <button className="kakao-login">
          카카오 계정으로 로그인
        </button>
      </div>
    </div>
  );
};

export default Login;