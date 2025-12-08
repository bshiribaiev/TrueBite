// src/pages/Forum.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createForumPost,
  subscribeToForumPosts,
  type ForumPost,
} from "../services/forumService";

export default function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToForumPosts((newPosts) => {
      setPosts(newPosts);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert("You must be logged in to post");
      return;
    }

    if (!newMessage.trim()) {
      alert("Please enter a message");
      return;
    }

    setPosting(true);
    try {
      await createForumPost(user.id, user.name, user.role, newMessage.trim());
      setNewMessage("");
    } catch (err) {
      console.error(err);
      alert("Failed to post message");
    } finally {
      setPosting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      manager: { color: "#e74c3c", label: "Manager" },
      chef: { color: "#f39c12", label: "Chef" },
      delivery: { color: "#3498db", label: "Delivery" },
      vip: { color: "#9b59b6", label: "VIP" },
      registered: { color: "#95a5a6", label: "Member" },
    };
    const badge = badges[role] || badges.registered;
    return (
      <span
        style={{
          backgroundColor: badge.color,
          color: "white",
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: "600",
          marginLeft: "8px",
        }}
      >
        {badge.label}
      </span>
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "24px",
            color: "white",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "28px" }}>💬 Discussion Forum</h1>
          <p style={{ margin: "8px 0 0", opacity: 0.9 }}>
            Share your thoughts with the TrueBite community
          </p>
        </div>

        {/* Post Form - Only for logged in users */}
        {user ? (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "20px",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontWeight: "600", color: "#374151" }}>
                Posting as {user.name}
              </span>
              {getRoleBadge(user.role)}
            </div>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <div style={{ marginTop: "12px", textAlign: "right" }}>
              <button
                type="submit"
                disabled={posting || !newMessage.trim()}
                style={{
                  backgroundColor: posting ? "#9ca3af" : "#667eea",
                  color: "white",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: posting ? "not-allowed" : "pointer",
                }}
              >
                {posting ? "Posting..." : "Post Message"}
              </button>
            </div>
          </form>
        ) : (
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#fef3c7",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#92400e" }}>
              👋 <strong>Want to join the conversation?</strong>{" "}
              <a href="/login" style={{ color: "#667eea" }}>
                Log in
              </a>{" "}
              or{" "}
              <a href="/login" style={{ color: "#667eea" }}>
                Register
              </a>{" "}
              to post messages.
            </p>
          </div>
        )}

        {/* Posts List */}
        <div style={{ padding: "20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <p style={{ fontSize: "48px", margin: "0 0 16px" }}>🦗</p>
              <p style={{ margin: 0 }}>No posts yet. Be the first to start a discussion!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: "600", color: "#1f2937" }}>
                        {post.userName}
                      </span>
                      {getRoleBadge(post.userRole)}
                    </div>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {formatTime(post.createdAt)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "#374151",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {post.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}