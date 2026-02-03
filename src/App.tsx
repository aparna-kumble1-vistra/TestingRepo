import { useState, useRef, useEffect } from "react";
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

// Simulated AI responses for demo purposes
const getAIResponse = (userMessage: string): string => {
  const responses = [
    "That's an interesting question! Let me help you with that.",
    "I understand what you're asking. Here's what I think...",
    "Based on your input, I can provide some insights.",
    "Great question! Let me break this down for you.",
    "I'd be happy to assist you with that.",
  ];
  
  // Simple response based on message content
  if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
    return "Hello! How can I assist you today?";
  }
  
  if (userMessage.toLowerCase().includes("help")) {
    return "I'm here to help! You can ask me anything, and I'll do my best to provide useful information. Feel free to start a new session anytime using the button in the sidebar.";
  }
  
  return `${responses[Math.floor(Math.random() * responses.length)]}\n\nYou mentioned: "${userMessage}"\n\nThis is a demo response. In a real application, this would be replaced with actual AI-generated content based on your message.`;
};

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "1",
      title: "Welcome Chat",
      timestamp: new Date(),
      messages: [
        {
          id: "1-1",
          role: "assistant",
          content: "Hello! I'm your AI assistant. How can I help you today?",
        },
      ],
    },
  ]);
  
  const [currentSessionId, setCurrentSessionId] = useState("1");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isTyping]);

  const handleNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: `New Chat ${sessions.length + 1}`,
      timestamp: new Date(),
      messages: [
        {
          id: `${Date.now()}-1`,
          role: "assistant",
          content: "Hello! I'm your AI assistant. How can I help you today?",
        },
      ],
    };
    
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleSendMessage = async (message: string) => {
    if (!currentSession) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: message,
    };

    // Add user message
    setSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? {
              ...session,
              messages: [...session.messages, userMessage],
              title: session.messages.length === 1 ? message.slice(0, 30) : session.title,
            }
          : session
      )
    );

    // Simulate AI typing
    setIsTyping(true);
    
    // Simulate API delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: getAIResponse(message),
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? { ...session, messages: [...session.messages, aiResponse] }
            : session
        )
      );
      
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
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
    <div className="flex h-screen bg-white">
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
      />
      
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 p-4 bg-white">
          <h1 className="text-gray-900">
            {currentSession?.title || "AI Chatbot"}
          </h1>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto">
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
              <div className="flex gap-4 p-6 bg-gray-50">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-600">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
      </div>
    </div>
  );
}
