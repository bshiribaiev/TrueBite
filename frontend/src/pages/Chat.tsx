import { useState, useRef, useEffect, type FormEvent } from "react";
import { api, type ChatResponse } from "../services/api";
import "../styles/chat-page.css";

type ChatMessage = { role: "user" | "bot"; text: string };

export default function Chat() {
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hi! 👋 I'm your TrueBite assistant. Ask me about our menu, prices, hours, or delivery!" },
  ]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [ratingMessage, setRatingMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [lastInteraction, setLastInteraction] = useState<{
    question: string;
    response: ChatResponse | null;
  }>({ question: "", response: null });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim() || isLoading) return;

    const userMsg = q;
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setQ("");
    setIsLoading(true);
    setSelectedRating(null);
    setRatingMessage("");

    try {
      const reply = await api.sendMessage(userMsg);
      setMessages((m) => [...m, { role: "bot", text: reply.text }]);
      setLastInteraction({ question: userMsg, response: reply });
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Sorry, something went wrong. Please try again." },
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
      setRatingMessage("Thanks for your feedback!");
    } catch {
      setRatingMessage("Couldn't save rating. Try again later.");
    }
  };

  const lastBot = lastInteraction.response;
  const canRateKb =
    lastBot && (lastBot.source === "KB" || lastBot.source === "FALLBACK" || lastBot.source === "LLM");

  const quickQuestions = [
    "What's on the menu?",
    "How much is the ramen?",
    "What are your hours?",
    "Do you deliver?",
  ];

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-icon">🍽️</div>
          <div className="chat-header-info">
            <h1>TrueBite Assistant</h1>
            <span className="chat-status">
              <span className="status-dot"></span>
              Online
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-message ${m.role === "user" ? "user" : "bot"}`}
            >
              {m.role === "bot" && (
                <div className="message-avatar">🤖</div>
              )}
              <div className="message-content">
                <div className="message-bubble">{m.text}</div>
                {m.role === "bot" && i === 0 && (
                  <div className="quick-questions">
                    {quickQuestions.map((qq) => (
                      <button
                        key={qq}
                        className="quick-btn"
                        onClick={() => {
                          setQ(qq);
                        }}
                      >
                        {qq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="chat-message bot">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="message-bubble typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Rating */}
        {canRateKb && (
          <div className="chat-rating">
            <span className="rating-label">Rate this response:</span>
            <div className="rating-buttons">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  className={`rating-btn ${selectedRating === r ? "selected" : ""}`}
                  onClick={() => handleRating(r)}
                >
                  {r === 1 ? "😠" : r === 2 ? "😕" : r === 3 ? "😐" : r === 4 ? "🙂" : "😍"}
                </button>
              ))}
            </div>
            <button
              className={`rating-btn outrageous ${selectedRating === 0 ? "selected" : ""}`}
              onClick={() => handleRating(0)}
              title="Report as inappropriate"
            >
              🚩
            </button>
            {ratingMessage && (
              <span className="rating-feedback">{ratingMessage}</span>
            )}
          </div>
        )}

        {/* Input */}
        <form onSubmit={ask} className="chat-input-form">
          <input
            type="text"
            className="chat-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type your question..."
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="chat-send-btn"
            disabled={isLoading || !q.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
