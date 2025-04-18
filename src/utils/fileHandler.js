// src/utils/fileHandler.js

// 파일 읽기 함수
export const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file, 'UTF-8');
  });
};

// 원본 텍스트 그대로 반환하는 함수
export const cleanupKakaoChat = (fileContent) => {
  // 어떤 처리도 하지 않고 원본 그대로 반환
  return fileContent;
};