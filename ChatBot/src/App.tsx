import { useState, useRef, useEffect, useMemo } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { ScrollArea } from "./components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  feedback?: "up" | "down" | null;
}

interface Session {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

export default function App() {
  const generateId = () => Math.random().toString(16).substring(2, 18);

  const [sessions, setSessions] = useState<Session[]>(() => {
    const initialId = generateId();
    return [
      {
        id: initialId,
        title: "Finance Assistance",
        timestamp: new Date(),
        messages: [
          {
            id: "welcome-1",
            role: "assistant",
            content: "Hello! I am your Genie Finance Assistant. How can I help you today?",
          },
        ],
      },
    ];
  });

  const [currentSessionId, setCurrentSessionId] = useState(() => sessions[0].id);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = useMemo(() => 
    sessions.find((s) => s.id === currentSessionId), 
    [sessions, currentSessionId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isTyping]);

  const handleNewSession = () => {
    const newId = generateId();
    const newSession: Session = {
      id: newId,
      title: `New Analysis`,
      timestamp: new Date(),
      messages: [
        {
          id: `${Date.now()}-1`,
          role: "assistant",
          content: "How can I help you today?",
        },
      ],
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  /**
   * FORMATTER: Transforms backend JSON into a Markdown string 
   * that ChatMessage.tsx regex can parse.
   */
  const formatChatbotOutput = (data: any) => {
    const mainMessage = data.output?.message || "";
    const sources = data.output?.sources || {};
    
    const validSourceEntries = Object.entries(sources).filter(
      ([_, source]: [string, any]) => source.text && source.text.trim().length > 0
    );

    let formatted = `${mainMessage}`;

    if (validSourceEntries.length > 0) {
      formatted += `\n\n**Related Documents:**\n`;

      const sourceBlocks = validSourceEntries.map(([key, source]: [string, any]) => {
        // Embed the SharePoint link in parentheses so the ChatMessage regex captures it
        const linkStr = source.sharepoint_link ? `(${source.sharepoint_link})` : "";
        const title = source.source_file_title || 'Document';
        
        return `**[${key}] ${title}** ${linkStr}\n*Click to view citation details*\n${source.text}`;
      });

      formatted += sourceBlocks.join("\n---\n");
    }

    return formatted;
  };

  const handleSendMessage = async (message: string) => {
    if (!currentSession) return;

    const targetSessionId = currentSessionId;
    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: message,
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === targetSessionId
          ? {
              ...session,
              messages: [...session.messages, userMessage],
              title: session.messages.length === 1 ? message.slice(0, 30) : session.title,
            }
          : session
      )
    );

    setIsTyping(true);

    try {
      const response = await fetch("https://geni-for-finance-dev-apim.azure-api.net/echo/chatbot_trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": "18a593212e3b430286388915081449a7", // Move to .env!
        },
        body: JSON.stringify({
          user_id: "aparna.kumble@vistra.com",
          user_message: message,
          session_id: targetSessionId,
        }),
      });

      if (!response.ok) throw new Error("Failed to connect to Azure");

      const data = await response.json();
      const formattedContent = formatChatbotOutput(data);

      const aiResponse: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: formattedContent,
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === targetSessionId
            ? { ...session, messages: [...session.messages, aiResponse] }
            : session
        )
      );
    } catch (error) {
      console.error("API Error:", error);
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, I'm having trouble connecting to the service right now.",
      };
      setSessions((prev) =>
        prev.map((session) =>
          session.id === targetSessionId
            ? { ...session, messages: [...session.messages, errorMessage] }
            : session
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleFeedback = (messageId: string, feedback: "up" | "down") => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? {
              ...session,
              messages: session.messages.map((msg) =>
                msg.id === messageId ? { ...msg, feedback } : msg
              ),
            }
          : session
      )
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
      />
      
      <div className="flex-1 flex flex-col bg-white">
        <div className="border-b border-gray-200 p-4 flex items-center bg-white shadow-sm">
          <h1 className="text-gray-900 font-bold">
            {currentSession?.title || "Genie Finance Assistance"}
          </h1>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto py-8 px-4">
            {currentSession?.messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                messageId={message.id}
                onFeedback={handleFeedback}
                initialFeedback={message.feedback}
              />
            ))}
            
            {isTyping && (
              <div className="flex gap-4 p-6 bg-gray-50 rounded-lg animate-pulse mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                  AI
                </div>
                <div className="flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.5s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t bg-white">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
          </div>
        </div>
      </div>
    </div>
  );
}