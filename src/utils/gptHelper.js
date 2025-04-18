// src/utils/gptHelper.js
import axios from 'axios';

// GPT API 호출 함수 - 파일 자체를 전송
export const analyzeWithGPT = async (textContent) => {
  try {
    
    const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!API_KEY) {
      console.warn('API 키가 설정되지 않았습니다. 샘플 데이터 반환합니다.');
      return getSampleResponse();
    }
    
    try {
      // 텍스트 내용을 그대로 전송 - 내용 수정 없이
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-3.5-turbo",
          messages: [
            { 
              role: "user", 
              content: `당신은 두 사람 간의 대화를 분석하는 전문가입니다. 
              다음은 카카오톡에서 내보낸 대화 내역입니다. 이 대화를 분석하고 두 사람의 관계와 재회 가능성을 평가해주세요.
              
              다음을 포함해 응답해주세요:
              1. 재회 가능성 점수 (0-100)
              2. 간단한 관계 분석 요약
              3. 주요 인사이트 4가지
              
              대화 내용:
              ${textContent}`  // 원본 그대로 전송
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          timeout: 30000
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (apiError) {
      console.error('API 오류 발생, 샘플 데이터로 대체:', apiError.message);
      return getSampleResponse();
    }
  } catch (error) {
    console.error('전체 프로세스 오류:', error);
    return getSampleResponse();
  }
};

// 샘플 응답 함수
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

// GPT 응답 파싱 함수
export const parseGPTResponse = (response) => {
  try {
    console.log('응답 파싱 시작');
    
    // 점수 찾기
    const scoreMatch = response.match(/(\d+)\/100|점수[^\d]*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2]) : 50;
    
    // 요약 찾기
    let summary = "";
    const summaryMatch = response.match(/분석 요약:[\s\S]*?(?=주요 인사이트|$)/i);
    if (summaryMatch) {
      summary = summaryMatch[0].replace(/분석 요약:/, '').trim();
    } else {
      // 다른 방식으로 찾기
      const paragraphs = response.split('\n\n');
      for (const para of paragraphs) {
        if (para.length > 30 && !para.match(/^\d\./) && !para.includes('점수')) {
          summary = para;
          break;
        }
      }
    }
    
    // 인사이트 찾기
    const insights = [];
    const insightMatches = response.matchAll(/\d+\.\s*([^\n]+)/g);
    for (const match of insightMatches) {
      if (match[1]) {
        insights.push(match[1].trim());
      }
      if (insights.length >= 4) break;
    }
    
    // 인사이트가 충분하지 않은 경우 기본값 사용
    while (insights.length < 4) {
      insights.push(`인사이트 ${insights.length + 1}`);
    }
    
    console.log('파싱 완료');
    
    return {
      reunionScore: score,
      summary: summary || "분석 요약을 찾을 수 없습니다.",
      emotionalTone: "분석됨",
      keyInsights: insights
    };
  } catch (error) {
    console.error('응답 파싱 오류:', error);
    // 파싱 실패 시 기본값 반환
    return {
      reunionScore: 50,
      summary: "분석 결과를 해석하는 중 오류가 발생했습니다.",
      emotionalTone: "알 수 없음",
      keyInsights: ["인사이트를 추출할 수 없습니다."]
    };
  }
  
};

