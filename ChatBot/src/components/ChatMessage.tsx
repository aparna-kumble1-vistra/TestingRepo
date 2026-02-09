import { ThumbsUp, ThumbsDown, User, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  messageId: string;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
  initialFeedback?: "up" | "down" | null;
}

export function ChatMessage({
  role,
  content,
  messageId,
  onFeedback,
  initialFeedback = null,
}: ChatMessageProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(initialFeedback);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const handleFeedback = (type: "up" | "down") => {
    const newFeedback = feedback === type ? null : type;
    setFeedback(newFeedback);
    if (onFeedback && newFeedback) {
      onFeedback(messageId, newFeedback);
    }
  };

  const toggleSource = (id: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isUser = role === "user";

  const parts = content.split("**Related Documents:**");
  const mainAnswer = parts[0];
  const sourcesRaw = parts[1] || "";

  const parseSources = (text: string) => {
    return text
      .split("---")
      .map((s) => s.trim())
      .filter((s) => s.includes("[") && s.length > 10)
      .map((s) => {
        const lines = s.split("\n").map(l => l.trim()).filter(l => l !== "");
        const titleLine = lines[0] || "";
        const detailLines = lines.slice(2).join("\n");
        const idMatch = titleLine.match(/\[(.*?)\]/);
        const id = idMatch ? idMatch[1] : Math.random().toString();
        return { id, title: titleLine, details: detailLines };
      })
      .filter((source) => source.details.trim().length > 0);
  };

  const sourceItems = parseSources(sourcesRaw);

  return (
    <div className={`flex gap-4 p-6 rounded-xl mb-4 ${isUser ? "bg-white border border-gray-100" : "bg-gray-50 border border-blue-50"}`}>
      <div className="flex-shrink-0">
        <div 
          key={`${messageId}-avatar`}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
            isUser ? "bg-blue-600" : "bg-gray-800"
          }`}
        >
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            /* Using a Robot Emoji: 100% stable, no loading required */
            <span className="text-xl" role="img" aria-label="robot">
              🤖
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isUser ? "text-gray-500" : "text-gray-600"}`}>
          {isUser ? "You" : "Genie Finance Assistance"}
        </div>

        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {mainAnswer}
          </ReactMarkdown>
        </div>

        {!isUser && sourceItems.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Related Documents
            </h4>
            <div className="space-y-3">
              {sourceItems.map((source) => (
                <div key={source.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:border-blue-200 transition-colors">
                  <button
                    onClick={() => toggleSource(source.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-blue-700 leading-tight">
                      <span className="inline-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{source.title}</ReactMarkdown>
                      </span>
                    </span>
                    {expandedSources[source.id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {expandedSources[source.id] && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-700 prose prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source.details}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isUser && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => handleFeedback("up")} className={`p-2 rounded-md hover:bg-gray-200 transition-all ${feedback === "up" ? "bg-blue-100 text-blue-600" : "text-gray-400"}`}>
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button onClick={() => handleFeedback("down")} className={`p-2 rounded-md hover:bg-gray-200 transition-all ${feedback === "down" ? "bg-red-100 text-red-600" : "text-gray-400"}`}>
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}