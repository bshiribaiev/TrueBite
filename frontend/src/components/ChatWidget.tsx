import { useState, useRef, useEffect, type FormEvent } from "react";
import { api, type ChatResponse } from "../services/api";
import "../styles/chat-widget.css";

type ChatMessage = { role: "user" | "bot"; text: string };

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hi! 👋 How can I help you today?" },
  ]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [lastInteraction, setLastInteraction] = useState<{
    question: string;
    response: ChatResponse | null;
  }>({ question: "", response: null });

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim() || isLoading) return;

    const userMsg = q;
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setQ("");
    setIsLoading(true);
    setSelectedRating(null);

    try {
      const reply = await api.sendMessage(userMsg);
      setMessages((m) => [...m, { role: "bot", text: reply.text }]);
      setLastInteraction({ question: userMsg, response: reply });
      if (!isOpen) setHasUnread(true);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Sorry, something went wrong." },
      ]);
      setLastInteraction({ question: userMsg, response: null });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRating = async (rating: number) => {
    if (!lastInteraction.response) return;
    setSelectedRating(rating);

    try {
      await api.rateChatResponse({
        question: lastInteraction.question,
        response: lastInteraction.response.text,
        rating,
        source: lastInteraction.response.source,
        kbIds: lastInteraction.response.kbIds,
      });
    } catch {
      // Silent fail for widget
    }
  };

  const lastBot = lastInteraction.response;
  const canRateKb = lastBot && (lastBot.source === "KB" || lastBot.source === "FALLBACK" || lastBot.source === "LLM");

  return (
    <>
      {/* Floating Button */}
      <button
        className={`chat-widget-trigger ${isOpen ? "open" : ""} ${hasUnread ? "has-unread" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {hasUnread && !isOpen && <span className="unread-dot"></span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-widget-window">
          <div className="widget-header">
            <div className="widget-header-info">
              <span className="widget-avatar">🍽️</span>
              <div>
                <h3>TrueBite Support</h3>
                <span className="widget-status">
                  <span className="status-dot"></span>
                  Online
                </span>
              </div>
            </div>
            <button className="widget-close" onClick={() => setIsOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="widget-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`widget-message ${m.role === "user" ? "user" : "bot"}`}
              >
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div className="widget-message bot typing">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {canRateKb && (
            <div className="widget-rating">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  className={`mini-rating ${selectedRating === r ? "selected" : ""}`}
                  onClick={() => handleRating(r)}
                >
                  {"⭐".repeat(r)}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={ask} className="widget-input-form">
            <input
              type="text"
              className="widget-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="widget-send"
              disabled={isLoading || !q.trim()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

