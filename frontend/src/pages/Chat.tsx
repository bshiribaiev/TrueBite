import { FormEvent, useState } from "react";
import { api, type ChatResponse } from "../services/api";

type ChatMessage = { role: "user" | "bot"; text: string };

export default function Chat() {
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hi! Ask about our hours, dishes, or delivery." },
  ]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [ratingMessage, setRatingMessage] = useState<string>("");

  // Metadata for the last bot response, used when sending ratings
  const [lastInteraction, setLastInteraction] = useState<{
    question: string;
    response: ChatResponse | null;
  }>({ question: "", response: null });

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
    } catch (error) {
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
      setRatingMessage("Thanks for your feedback.");
    } catch {
      setRatingMessage("We couldn't record your rating. Please try again later.");
    }
  };

  const lastBot = lastInteraction.response;
  const canRateKb =
    lastBot && (lastBot.source === "KB" || lastBot.source === "FALLBACK");

  return (
    <div className="chat">
      <h1 className="h1">Chat</h1>
      <div className="chatbox">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`bubble ${m.role === "user" ? "right" : "left"}`}
          >
            {m.text}
          </div>
        ))}
        {isLoading && <div className="bubble left">Typing...</div>}
      </div>

      {/* Simple rating UI for the last KB-based response */}
      {canRateKb && (
        <div style={{ marginTop: "8px", marginBottom: "8px", fontSize: 14 }}>
          <span style={{ marginRight: 8 }}>Rate this answer:</span>
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRating(r)}
              style={{
                marginRight: 4,
                padding: "2px 6px",
                borderRadius: 4,
                border:
                  selectedRating === r ? "2px solid #f97316" : "1px solid #e5e7eb",
                background:
                  r === 0
                    ? selectedRating === r
                      ? "#fecaca"
                      : "#fee2e2"
                    : selectedRating === r
                    ? "#e5e7eb"
                    : "#f3f4f6",
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
          <span style={{ marginLeft: 8, color: "#6b7280" }}>
            0 = outrageous
          </span>
          {ratingMessage && (
            <span style={{ marginLeft: 12, color: "#10b981" }}>
              {ratingMessage}
            </span>
          )}
        </div>
      )}

      <form onSubmit={ask} className="chat-form">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a question..."
          disabled={isLoading}
        />
        <button className="btn" type="submit" disabled={isLoading}>
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
