import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useEffect, useMemo, useRef, useState } from "react";

// Simple chat types matching Google Gen AI SDK
export type Part = { text: string };
export type ChatMsg = { role: "user" | "model"; parts: Part[] };

type Props = {
  defaultModel?: string;
  starter?: string;
};

export default function AItest({
  defaultModel = "gemini-2.5-flash",
  starter = "今天松山新店線捷運壅擠程度?",
}: Props) {
  const [model, setModel] = useState<string>(defaultModel);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("gemini_api_key");
    if (saved) setApiKey(saved);
  }, []);

  useEffect(() => {
    setHistory([
      { role: "model", parts: [{ text: "嗨👋 我是你的台北小助手，想知道什麼都可以問我喔！" }] },
    ]);
    if (starter) setInput(starter);
  }, [starter]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history, loading]);

  const ai = useMemo(() => {
    try {
      return apiKey ? new GoogleGenerativeAI(apiKey) : null;
    } catch {
      return null;
    }
  }, [apiKey]);

  async function sendMessage(message?: string) {
    const content = (message ?? input).trim();
    if (!content || loading) return;
    if (!ai) {
      setError("請先輸入有效的 Gemini API Key");
      return;
    }

    setError("");
    setLoading(true);

    const newHistory: ChatMsg[] = [...history, { role: "user", parts: [{ text: content }] }];
    setHistory(newHistory);
    setInput("");

    try {
      const modelClient = ai.getGenerativeModel({ model });
      const result = await modelClient.generateContent({
        contents: newHistory,
      });

      const reply = result.response.text() || "[No content]";
      setHistory((h) => [...h, { role: "model", parts: [{ text: reply }] }]);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function renderMarkdownLike(text: string) {
    const lines = text.split(/\n/);
    return (
      <>
        {lines.map((ln, i) => (
          <div key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {ln}
          </div>
        ))}
      </>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>💬 台北市小助手</div>

        <div style={styles.controls}>
          <label style={styles.label}>
            <span>模型名稱</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="例如 gemini-2.5-flash、gemini-2.5-pro"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            <span>Gemini API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                const v = e.target.value;
                setApiKey(v);
                if (rememberKey) localStorage.setItem("gemini_api_key", v);
              }}
              placeholder="貼上你的 API Key"
              style={styles.input}
            />
            <label style={styles.remember}>
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={(e) => {
                  setRememberKey(e.target.checked);
                  if (!e.target.checked) localStorage.removeItem("gemini_api_key");
                  else if (apiKey) localStorage.setItem("gemini_api_key", apiKey);
                }}
              />
              <span>記住在本機</span>
            </label>
          </label>
        </div>

        <div ref={listRef} style={styles.messages}>
          {history.map((m, idx) => (
            <div
              key={idx}
              style={{
                ...styles.msg,
                ...(m.role === "user" ? styles.user : styles.assistant),
              }}
            >
              <div style={styles.msgRole}>{m.role === "user" ? "🧍‍♀️ 你" : "🤖 Gemini"}</div>
              <div style={styles.msgBody}>{renderMarkdownLike(m.parts.map((p) => p.text).join("\n"))}</div>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.msg, ...styles.assistant }}>
              <div style={styles.msgRole}>🤖 Gemini</div>
              <div style={styles.msgBody}>正在思考中… 💭</div>
            </div>
          )}
        </div>

        {error && <div style={styles.error}>⚠ {error}</div>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          style={styles.composer}
        >
          <input
            placeholder="輸入訊息，按 Enter 送出"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={styles.textInput}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !apiKey}
            style={styles.sendBtn}
          >
            🚀 送出
          </button>
        </form>

        <div style={styles.quickWrap}>
          {["今天台北有什麼免費展覽？", "怎麼從台北車站到古亭捷運站", "台北市有什麼好吃的美食"].map((q) => (
            <button key={q} type="button" style={styles.suggestion} onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "grid",
    placeItems: "start",
    padding: 20,
    background: "linear-gradient(135deg, #cce5ff, #e0f2ff, #f0f9ff)",
    minHeight: "100vh",
  },
  card: {
    width: "min(900px, 100%)",
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: 20,
    boxShadow: "0 6px 20px rgba(0, 80, 255, 0.1)",
    overflow: "hidden",
  },
  header: {
    padding: "14px 16px",
    fontWeight: 700,
    fontSize: 18,
    borderBottom: "2px solid #bfdbfe",
    background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
    color: "#fff",
  },
  controls: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "1fr 1fr",
    padding: 14,
    background: "#f0f9ff",
  },
  label: { display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "#1e3a8a" },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #bfdbfe",
    fontSize: 14,
    background: "#fff",
    transition: "all 0.2s",
  },
  remember: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#1d4ed8",
    marginTop: 4,
  },
  messages: {
    padding: 14,
    display: "grid",
    gap: 10,
    maxHeight: 420,
    overflow: "auto",
    background: "#eff6ff",
  },
  msg: {
    borderRadius: 16,
    padding: 10,
    fontSize: 14,
    lineHeight: 1.5,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  user: {
    background: "#dbeafe",
    border: "1px solid #bfdbfe",
    alignSelf: "end",
    justifySelf: "end",
    maxWidth: "80%",
  },
  assistant: {
    background: "#e0f2fe",
    border: "1px solid #bae6fd",
    maxWidth: "80%",
  },
  msgRole: { fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 4 },
  msgBody: { fontSize: 14 },
  error: { color: "#b91c1c", padding: "6px 14px", background: "#fee2e2", borderRadius: 8, margin: 10 },
  composer: {
    padding: 12,
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    borderTop: "1px solid #bfdbfe",
    background: "#f8fafc",
  },
  textInput: {
    padding: "10px 14px",
    borderRadius: 20,
    border: "1px solid #bfdbfe",
    fontSize: 14,
    outline: "none",
    transition: "all 0.2s",
  },
  sendBtn: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 600,
    transition: "transform 0.1s ease",
  },
  quickWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    margin: "8px 12px 16px",
  },
  suggestion: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    cursor: "pointer",
    fontSize: 13,
    color: "#1e3a8a",
    transition: "all 0.2s",
  },
};
