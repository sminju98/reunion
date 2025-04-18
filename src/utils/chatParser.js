// chatParser.js

/**
 * 카카오톡 채팅 내보내기 파일을 파싱하는 함수
 * @param {string} fileContent - 카카오톡 채팅 파일 내용
 * @returns {Array} 파싱된 메시지 배열
 */
export const parseKakaoTalkChat = (fileContent) => {
    // 줄 단위로 분리
    const lines = fileContent.split('\n');
    const messages = [];
    let currentDate = '';
    let currentMessage = null;
  
    // 카카오톡 메시지 형식: "날짜 요일"
    const dateRegex = /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (월|화|수|목|금|토|일)요일$/;
    
    // 메시지 형식: "[시간] [이름] : [내용]"
    const messageRegex = /^\[(오전|오후) (\d{1,2}):(\d{2})\] (.+?) : (.+)$/;
  
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      // 날짜 확인
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        currentDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        continue;
      }
      
      // 메시지 확인
      const messageMatch = line.match(messageRegex);
      if (messageMatch) {
        if (currentMessage) {
          messages.push(currentMessage);
        }
  
        const ampm = messageMatch[1];
        let hour = parseInt(messageMatch[2]);
        const minute = messageMatch[3];
        const sender = messageMatch[4];
        const content = messageMatch[5];
  
        // 12시간제 -> 24시간제 변환
        if (ampm === '오후' && hour < 12) {
          hour += 12;
        } else if (ampm === '오전' && hour === 12) {
          hour = 0;
        }
  
        currentMessage = {
          date: currentDate,
          time: `${hour.toString().padStart(2, '0')}:${minute}`,
          sender,
          content,
          timestamp: new Date(`${currentDate}T${hour.toString().padStart(2, '0')}:${minute}:00`)
        };
      } else if (currentMessage) {
        // 다음 줄이 이어지는 메시지 내용인 경우
        currentMessage.content += '\n' + line;
      }
    }
  
    // 마지막 메시지 추가
    if (currentMessage) {
      messages.push(currentMessage);
    }
  
    return messages;
  };
  
  /**
   * 파싱된 메시지를 GPT에 보내기 위한 형식으로 변환
   * @param {Array} messages - 파싱된 메시지 배열
   * @returns {string} GPT에 전송할 포맷의 문자열
   */
  export const formatMessagesForGPT = (messages) => {
    // 메시지 최대 수 제한 (토큰 제한을 고려)
    const maxMessages = 200; 
    const recentMessages = messages.slice(-maxMessages);
    
    return recentMessages.map(msg => 
      `[${msg.date} ${msg.time}] ${msg.sender}: ${msg.content}`
    ).join('\n\n');
  };
  
  /**
   * 대화 참여자 정보 추출 함수
   * @param {Array} messages - 파싱된 메시지 배열
   * @returns {Object} 참여자 정보
   */
  export const extractParticipants = (messages) => {
    const participants = {};
    
    messages.forEach(msg => {
      if (!participants[msg.sender]) {
        participants[msg.sender] = {
          messageCount: 0,
          firstMessage: msg.timestamp
        };
      }
      
      participants[msg.sender].messageCount++;
      
      if (msg.timestamp < participants[msg.sender].firstMessage) {
        participants[msg.sender].firstMessage = msg.timestamp;
      }
    });
    
    return participants;
  };
  
  /**
   * 대화 기간 및 기본 통계 추출 함수
   * @param {Array} messages - 파싱된 메시지 배열
   * @returns {Object} 대화 통계 정보
   */
  export const extractChatStats = (messages) => {
    if (messages.length === 0) return {};
    
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    
    const startDate = new Date(firstMessage.timestamp);
    const endDate = new Date(lastMessage.timestamp);
    
    // 대화 기간 (일)
    const durationDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return {
      startDate: firstMessage.date,
      endDate: lastMessage.date,
      messageCount: messages.length,
      durationDays
    };
  };