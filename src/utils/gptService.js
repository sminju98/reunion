// gptService.js
import axios from 'axios';

const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * 대화 내용을 분석하여 재회 가능성 점수와 인사이트를 제공하는 함수
 * @param {string} chatContent - 분석할 대화 내용
 * @returns {Promise} 분석 결과 객체
 */
export const analyzeChat = async (chatContent) => {
  const prompt = `
당신은 헤어진 연인들의 카카오톡 대화를 분석하여 재회 가능성을 진단하는 전문가입니다. 다음 대화를 분석하고 재회 가능성 점수, 요약, 주요 인사이트를 제공해주세요.

분석할 대화:
${chatContent}

다음 형식으로 JSON 응답을 제공해주세요:
{
  "reunionScore": 0-100 사이의 정수 (재회 가능성 점수),
  "summary": "대화 분석 요약",
  "emotionalTone": "감정적 톤 평가",
  "keyInsights": ["주요 인사이트 1", "주요 인사이트 2", "주요 인사이트 3", "주요 인사이트 4"]
}
`;

  try {
    const response = await axios.post(
      API_URL,
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    // GPT 응답에서 JSON 부분만 추출하여 파싱
    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/({[\s\S]*})/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('분석 결과를 파싱할 수 없습니다.');
    }
  } catch (error) {
    console.error('GPT API 호출 오류:', error);
    throw error;
  }
};

/**
 * 대화 내용과 분석 결과를 기반으로 메시지 추천을 제공하는 함수
 * @param {string} chatContent - 대화 내용
 * @param {Object} analysisResult - 분석 결과
 * @returns {Promise} 추천 메시지 배열
 */
// gptService.js에서 문제가 있는 함수 수정
export const generateMessageSuggestions = async (chatContent, analysisResult) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
    
    try {
      const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-3.5-turbo",
          messages: [
            { 
              role: "user", 
              content: `당신은 헤어진 연인들의 카카오톡 대화를 분석하고 상황에 맞는 메시지를 추천하는 전문가입니다. 
              다음은 대화 내용과 분석 결과입니다.
  
              분석 결과:
              - 재회 가능성 점수: ${analysisResult.reunionScore}
              - 감정 톤: ${analysisResult.emotionalTone}
              - 인사이트: ${analysisResult.keyInsights.join(', ')}
  
              이 정보를 바탕으로 다음 세 가지 톤으로 메시지를 작성해주세요:
              1. 친근하고 일상적인 톤
              2. 진지하고 감성적인 톤
              3. 가볍고 유머러스한 톤
  
              각 메시지는 자연스럽게 대화를 재개하거나 관계를 개선할 수 있는 내용이어야 합니다.
  
              다음 형식으로 JSON 응답을 제공해주세요:
              {
                "messages": [
                  {
                    "tone": "친근하고 일상적인 톤",
                    "content": "메시지 내용"
                  },
                  {
                    "tone": "진지하고 감성적인 톤",
                    "content": "메시지 내용"
                  },
                  {
                    "tone": "가볍고 유머러스한 톤",
                    "content": "메시지 내용"
                  }
                ]
              }`
            }
          ],
          temperature: 0.8,
          max_tokens: 1000,
          signal: controller.signal  // AbortController 시그널 추가
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      // GPT 응답에서 JSON 부분만 추출하여 파싱
      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/({[\s\S]*})/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]).messages;
      } else {
        throw new Error('메시지 추천 결과를 파싱할 수 없습니다.');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('GPT API 호출 오류:', error);
      throw error;
    }
  };