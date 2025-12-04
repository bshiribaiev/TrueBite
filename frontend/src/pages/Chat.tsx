import { FormEvent, useState } from "react";
import { api } from "../services/api";

export default function Chat() {
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{role:"user"|"bot"; text:string}[]>([
    { role: "bot", text: "Hi! Ask about our hours, dishes, or delivery." }
  ]);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim() || isLoading) return;
    
    const userMsg = q;
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setQ("");
    setIsLoading(true);

    try {
      const reply = await api.sendMessage(userMsg);
      setMessages(m => [...m, { role: "bot", text: reply }]);
    } catch (error) {
      setMessages(m => [...m, { role: "bot", text: "Sorry, something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat">
      <h1 className="h1">Chat</h1>
      <div className="chatbox">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "right" : "left"}`}>{m.text}</div>
        ))}
        {isLoading && <div className="bubble left">Typing...</div>}
      </div>
      <form onSubmit={ask} className="chat-form">
        <input 
          className="input" 
          value={q} 
          onChange={e => setQ(e.target.value)} 
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
