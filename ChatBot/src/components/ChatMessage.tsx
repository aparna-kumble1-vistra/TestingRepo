import { ThumbsUp, ThumbsDown, User, ChevronDown, ChevronUp, FileText, ExternalLink, Copy, Check } from "lucide-react";
import { useState, useMemo } from "react";
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
  const [copied, setCopied] = useState(false);

  const isUser = role === "user";

  // Split logic: Assistant messages often contain a citation block after a specific header
  const [mainAnswer, sourcesRaw] = content.split("**Related Documents:**");

  const handleCopy = () => {
    navigator.clipboard.writeText(mainAnswer.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: "up" | "down") => {
    const newFeedback = feedback === type ? null : type;
    setFeedback(newFeedback);
    if (onFeedback) onFeedback(messageId, newFeedback as "up" | "down");
  };

  const toggleSource = (id: string) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleSourceItems = useMemo(() => {
    if (!sourcesRaw || isUser) return [];

    // Improved regex: Matches [1], [Source_A], [Doc-123] etc.
    const citedIds = new Set([...mainAnswer.matchAll(/\[(.*?)\]/g)].map(m => m[1]));

    return sourcesRaw
      .split("---")
      .map((s) => s.trim())
      .filter((s) => s.includes("[") && s.length > 10)
      .map((s) => {
        const urlMatch = s.match(/\((https?:\/\/[^)]+)\)/);
        const url = urlMatch ? urlMatch[1].trim() : null;
        const cleanSource = urlMatch ? s.replace(urlMatch[0], "").trim() : s;
        
        const lines = cleanSource.split("\n").map(l => l.trim()).filter(Boolean);
        const titleLine = lines[0] || "";
        
        const idMatch = titleLine.match(/\[(.*?)\]/);
        const id = idMatch ? idMatch[1] : "";

        const details = lines.slice(1)
          .filter(line => !line.toLowerCase().includes("click to view"))
          .join("\n");

        const displayTitle = titleLine.replace(/\[.*?\]/, "").trim();

        return { id, title: displayTitle, details, url };
      })
      // Only show sources the AI actually referenced in the text
      .filter((source) => source.id && citedIds.has(source.id));
    
  }, [mainAnswer, sourcesRaw, isUser]);

  return (
    <div className={`group flex gap-4 p-6 rounded-xl mb-4 transition-colors ${
      isUser ? "bg-white border border-gray-100" : "bg-gray-50 border border-blue-50"
    }`}>
      {/* Avatar Section */}
      <div className="flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
          isUser ? "bg-blue-600" : "bg-slate-800"
        }`}>
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <span className="text-xl" role="img" aria-label="robot">🤖</span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className={`text-xs font-bold uppercase tracking-widest ${isUser ? "text-gray-400" : "text-blue-600"}`}>
            {isUser ? "User Query" : "Genie AI Analysis"}
          </div>
          {!isUser && (
            <button 
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600"
              title="Copy response"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainAnswer}</ReactMarkdown>
        </div>

        {/* Citations Section */}
        {!isUser && visibleSourceItems.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Supporting Evidence
            </h4>
            
            <div className="grid gap-3">
              {visibleSourceItems.map((source) => (
                <div key={source.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleSource(source.id)}
                      className="flex-1 flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-700 rounded text-[10px] font-bold flex items-center justify-center border border-blue-100">
                        {source.id}
                      </span>
                      <span className="text-sm font-semibold text-gray-700 truncate">
                        {source.title}
                      </span>
                      {expandedSources[source.id] ? (
                        <ChevronUp className="w-4 h-4 ml-auto text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
                      )}
                    </button>

                    {source.url && (
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 text-blue-600 hover:bg-blue-50 border-l border-gray-100"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  
                  {expandedSources[source.id] && (
                    <div className="p-4 bg-slate-50 border-t border-gray-100 text-sm text-gray-600 animate-in fade-in slide-in-from-top-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source.details}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        {!isUser && (
          <div className="flex gap-2 mt-6">
            <button 
              onClick={() => handleFeedback("up")} 
              className={`p-1.5 rounded-md transition-colors ${feedback === "up" ? "bg-blue-100 text-blue-600" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleFeedback("down")} 
              className={`p-1.5 rounded-md transition-colors ${feedback === "down" ? "bg-red-100 text-red-600" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}