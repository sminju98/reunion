// src/utils/assistantService.js
import OpenAI from 'openai';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // 브라우저에서 API 키 사용 (개발용, 실제 배포 시 보안 고려 필요)
});

// 어시스턴트 ID (한 번 생성 후 재사용)
let ASSISTANT_ID = "asst_Rba3uOTCIgzHcCptAY0F2z65";

// 어시스턴트 생성 또는 가져오기
export const getOrCreateAssistant = async () => {
  if (ASSISTANT_ID) {
    try {
      // 이미 생성된 어시스턴트 확인
      const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
      return assistant;
    } catch (error) {
      console.log('기존 어시스턴트를 찾을 수 없습니다. 새로 생성합니다.');
      ASSISTANT_ID = null;
    }
  }
  
  // 새 어시스턴트 생성
  const assistant = await openai.beta.assistants.create({
    name: "리유니온 대화 분석가",
    description: "카카오톡 대화를 분석하여 재회 가능성을 평가합니다.",
    instructions: `당신은 헤어진 연인들의 카카오톡 대화를 분석하는 전문가입니다. 
    업로드된 파일을 분석하고 두 사람의 관계와 재회 가능성을 평가해주세요.
    
    다음을 포함해 응답해주세요:
    1. 재회 가능성 점수 (0-100)
    2. 간단한 관계 분석 요약
    3. 주요 인사이트 4가지`,
    model: "gpt-3.5-turbo",
  });
  
  ASSISTANT_ID = assistant.id;
  return assistant;
};

// 파일 업로드
export const uploadFile = async (fileContent, fileName) => {
  try {
    // 파일 내용을 Blob으로 변환
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });
    
    // OpenAI에 파일 업로드
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: 'assistants',
    });
    
    return uploadedFile.id;
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    throw error;
  }
};

// 대화 분석 실행
export const analyzeChatWithAssistant = async (fileContent, fileName) => {
  try {
    // 어시스턴트 가져오기 또는 생성
    const assistant = await getOrCreateAssistant();
    
    // 파일 업로드
    const fileId = await uploadFile(fileContent, fileName);
    
    // 스레드 생성
    const thread = await openai.beta.threads.create();
    
    // 메시지 생성 (파일 첨부)
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "이 카카오톡 대화를 분석하여 두 사람의 재회 가능성을 평가해주세요.",
      file_ids: [fileId],
    });
    
    // 실행
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });
    
    // 결과 대기 (폴링 방식)
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    // 최대 30초 대기 (실제로는 더 오래 걸릴 수 있음)
    let attempts = 0;
    const maxAttempts = 30;
    
    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }
    
    if (runStatus.status !== 'completed') {
      throw new Error('분석 시간이 너무 오래 걸립니다.');
    }
    
    // 응답 조회
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    // 마지막 어시스턴트 메시지 찾기
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length === 0) {
      throw new Error('어시스턴트 응답을 찾을 수 없습니다.');
    }
    
    // 텍스트 응답 추출
    const responseContent = assistantMessages[0].content[0].text.value;
    
    // 파일 삭제 (선택사항)
    await openai.files.del(fileId);
    
    return responseContent;
  } catch (error) {
    console.error('어시스턴트 분석 오류:', error);
    throw error;
  }
};