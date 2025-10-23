import { FormEvent, useState } from "react";

export default function Chat() {
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<{role:"user"|"bot"; text:string}[]>([
    { role: "bot", text: "Hi! Ask about our hours, dishes, or delivery." }
  ]);

  const ask = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setMessages(m => [...m, { role: "user", text: q }]);
    // mock KB/LLM reply:
    const reply = q.toLowerCase().includes("hour")
      ? "We’re open 10am–10pm daily."
      : "Thanks! A manager will follow up. (Mock LLM response)";
    setMessages(m => [...m, { role: "bot", text: reply }]);
    setQ("");
  };

  return (
    <div className="chat">
      <h1 className="h1">Chat</h1>
      <div className="chatbox">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "right" : "left"}`}>{m.text}</div>
        ))}
      </div>
      <form onSubmit={ask} className="chat-form">
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Ask a question..." />
        <button className="btn" type="submit">Send</button>
      </form>
    </div>
  );
}
