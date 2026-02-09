import { ThumbsUp, ThumbsDown, User, ChevronDown, ChevronUp, FileText, ExternalLink } from "lucide-react";
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

  // Split logic to separate the AI answer from the citations block
  const [mainAnswer, sourcesRaw] = content.split("**Related Documents:**");

  /**
   * Filter and Parse Logic
   * 1. Extracts numbers [1][2] from the main response.
   * 2. Captures SharePoint URLs using a robust "Until-Paren" regex.
   * 3. Cleans titles to prevent URL leakage.
   */
  const visibleSourceItems = useMemo(() => {
    if (!sourcesRaw || isUser) return [];

    // 1. Find all citation numbers in the text (e.g., [1], [10])
    const citedNumbers = new Set([...mainAnswer.matchAll(/\[(\d+)\]/g)].map(m => m[1]));

    // 2. Process the sources block
    return sourcesRaw
      .split("---")
      .map((s) => s.trim())
      .filter((s) => s.includes("[") && s.length > 10)
      .map((s) => {
        // Robust Regex: Match everything between ( and ) that starts with http
        // This handles complex SharePoint query parameters safely.
        const urlMatch = s.match(/\((https?:\/\/[^)]+)\)/);
        const url = urlMatch ? urlMatch[1].trim() : null;

        // Clean the string: Remove the entire (http...) block so it doesn't leak into UI text
        const cleanSource = urlMatch ? s.replace(urlMatch[0], "").trim() : s;
        
        const lines = cleanSource.split("\n").map(l => l.trim()).filter(l => l !== "");
        const titleLine = lines[0] || "";
        
        // Extract ID (the number inside the brackets)
        const idMatch = titleLine.match(/\[(.*?)\]/);
        const id = idMatch ? idMatch[1] : "";

        // Filter out the title and the "Click to view" instruction to get details
        const details = lines.slice(1)
          .filter(line => !line.toLowerCase().includes("click to view"))
          .join("\n");

        // Strip the [ID] from the title text for a cleaner look
        const displayTitle = titleLine.replace(/\[.*?\]/, "").trim();

        return { id, title: displayTitle, details, url };
      })
      // 3. ONLY show sources that were actually cited in the response text
      .filter((source) => citedNumbers.has(source.id));
    
  }, [mainAnswer, sourcesRaw, isUser]);

  return (
    <div className={`flex gap-4 p-6 rounded-xl mb-4 ${isUser ? "bg-white border border-gray-100" : "bg-gray-50 border border-blue-50"}`}>
      <div className="flex-shrink-0">
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
            isUser ? "bg-blue-600" : "bg-gray-800"
          }`}
        >
          {isUser ? <User className="w-5 h-5 text-white" /> : <span className="text-xl" role="img" aria-label="robot">🤖</span>}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isUser ? "text-gray-500" : "text-gray-600"}`}>
          {isUser ? "You" : "Genie Finance Assistance"}
        </div>

        {/* The AI's written response */}
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed mb-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainAnswer}</ReactMarkdown>
        </div>

        {/* The dynamic citations list */}
        {!isUser && visibleSourceItems.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Cited Documents
            </h4>
            
            <div className="space-y-3">
              {visibleSourceItems.map((source) => (
                <div key={source.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:border-blue-200 transition-all">
                  <div className="flex items-center w-full">
                    {/* Expandable Title Section */}
                    <button
                      onClick={() => toggleSource(source.id)}
                      className="flex-1 flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-700 leading-tight">
                        <span className="text-blue-600 font-bold mr-2">[{source.id}]</span>
                        {source.title}
                      </div>
                      {expandedSources[source.id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {/* External Link (SharePoint) Button */}
                    {source.url && (
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 text-blue-600 hover:text-blue-800 border-l border-gray-100 flex items-center gap-1 text-xs font-bold shrink-0 bg-white hover:bg-blue-50 transition-colors"
                        title="Open original document in SharePoint"
                      >
                        <ExternalLink className="w-4 h-4" />
                        VIEW
                      </a>
                    )}
                  </div>
                  
                  {/* Detailed Citation Content (Hidden until expanded) */}
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

        {/* Feedback Buttons */}
        {!isUser && (
          <div className="flex gap-2 mt-6">
            <button 
              onClick={() => handleFeedback("up")} 
              className={`p-2 rounded-md hover:bg-gray-200 transition-all ${feedback === "up" ? "bg-blue-100 text-blue-600" : "text-gray-400"}`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleFeedback("down")} 
              className={`p-2 rounded-md hover:bg-gray-200 transition-all ${feedback === "down" ? "bg-red-100 text-red-600" : "text-gray-400"}`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}