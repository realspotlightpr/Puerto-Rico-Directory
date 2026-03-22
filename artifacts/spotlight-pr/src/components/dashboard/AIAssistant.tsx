import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Send, Loader2, Bot, User as UserIcon, Sparkles, ImagePlus,
  PlusCircle, Trash2, MessageSquare, Image as ImageIcon, X,
  ChevronDown, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  createdAt?: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface AIAssistantProps {
  businessId: number;
  businessName: string;
}

const IMAGE_TRIGGER = /^(generate|create|make|draw|show)\s+(an?\s+)?(image|photo|picture|illustration)\s+of\s+/i;

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-bold mt-3 mb-1 text-foreground">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-lg font-bold mt-3 mb-1 text-foreground">{line.slice(2)}</h1>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-bold mt-2 mb-0.5 text-foreground">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 text-sm list-disc">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={i} className="ml-4 text-sm list-decimal">
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export function AIAssistant({ businessId, businessName }: AIAssistantProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ── Load conversations ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingConvs(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/openai/conversations?businessId=${businessId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          if (data.length > 0) {
            loadConversation(data[0].id, token);
          }
        }
      } catch {
        // silently ignore
      } finally {
        setLoadingConvs(false);
      }
    }
    load();
  }, [businessId]);

  async function loadConversation(id: number, token?: string | null) {
    setActiveConvId(id);
    const t = token ?? (await getToken());
    const res = await fetch(`/api/openai/conversations/${id}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }

  async function createNewConversation() {
    const token = await getToken();
    const title = `${businessName} chat – ${format(new Date(), "MMM d, h:mm a")}`;
    const res = await fetch("/api/openai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, businessId }),
    });
    if (res.ok) {
      const conv = await res.json();
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    }
  }

  async function deleteConversation(id: number) {
    const token = await getToken();
    await fetch(`/api/openai/conversations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
  }

  // ── Send text message ───────────────────────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || streaming) return;

    // Auto-create conversation if none exists
    let convId = activeConvId;
    if (!convId) {
      const token = await getToken();
      const title = input.slice(0, 60) + (input.length > 60 ? "…" : "");
      const res = await fetch("/api/openai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, businessId }),
      });
      if (!res.ok) return;
      const conv = await res.json();
      convId = conv.id;
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
    }

    // Check if message is an image request
    if (IMAGE_TRIGGER.test(input.trim())) {
      const prompt = input.trim().replace(IMAGE_TRIGGER, "");
      await handleImageGenFromChat(convId, input.trim(), prompt);
      return;
    }

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    const savedInput = input;
    setInput("");
    setStreaming(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: savedInput }),
      });

      if (!response.body) throw new Error("No stream");

      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(part.slice(6));
            if (json.done) break;
            if (json.content) {
              setMessages(prev => {
                const msgs = [...prev];
                const last = msgs[msgs.length - 1];
                if (last.role === "assistant") {
                  msgs[msgs.length - 1] = { ...last, content: last.content + json.content };
                }
                return msgs;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to get AI response", variant: "destructive" });
    } finally {
      setStreaming(false);
    }
  }

  // ── Image generation from chat ──────────────────────────────────────────
  async function handleImageGenFromChat(convId: number, userText: string, prompt: string) {
    const userMsg: Message = { role: "user", content: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setGeneratingImage(true);

    try {
      const token = await getToken();
      const res = await fetch("/api/openai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: `${prompt} — for a Puerto Rico business called "${businessName}"`, size: "1024x1024" }),
      });
      if (!res.ok) throw new Error("Image generation failed");
      const { b64_json } = await res.json();
      const imageUrl = `data:image/png;base64,${b64_json}`;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Here's the image I generated for you: "${prompt}"`,
        imageUrl,
      }]);
    } catch {
      toast({ title: "Image generation failed", description: "Please try again", variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  }

  // ── Direct image generation ─────────────────────────────────────────────
  async function generateImage() {
    if (!imagePrompt.trim() || generatingImage) return;

    // Auto-create conversation if needed
    let convId = activeConvId;
    if (!convId) {
      const token = await getToken();
      const res = await fetch("/api/openai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: `Image: ${imagePrompt.slice(0, 50)}`, businessId }),
      });
      if (!res.ok) return;
      const conv = await res.json();
      convId = conv.id;
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
    }

    const userMsg: Message = { role: "user", content: `🎨 Generate image: "${imagePrompt}"` };
    setMessages(prev => [...prev, userMsg]);
    setGeneratingImage(true);
    setShowImagePanel(false);

    try {
      const token = await getToken();
      const res = await fetch("/api/openai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: `${imagePrompt} — for a Puerto Rico business called "${businessName}"`,
          size: "1024x1024",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { b64_json } = await res.json();
      const imageUrl = `data:image/png;base64,${b64_json}`;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Here's your image for "${imagePrompt}". You can right-click to save it!`,
        imageUrl,
      }]);
      setImagePrompt("");
    } catch {
      toast({ title: "Image generation failed", description: "Please try again", variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[680px] rounded-2xl border border-border overflow-hidden bg-white shadow-sm">

      {/* Sidebar: conversation list */}
      <div className="w-60 border-r border-border flex flex-col bg-muted/30 shrink-0">
        <div className="p-3 border-b border-border">
          <Button
            size="sm"
            className="w-full rounded-xl gap-2 text-xs"
            onClick={createNewConversation}
          >
            <PlusCircle className="w-3.5 h-3.5" /> New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
          {loadingConvs ? (
            <div className="flex justify-center pt-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center pt-8 px-3">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Start a new chat to get AI help with your business</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${activeConvId === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                onClick={() => loadConversation(conv.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="text-xs flex-1 truncate">{conv.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all"
                  onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Suggested prompts */}
        <div className="p-3 border-t border-border space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Prompts</p>
          {[
            "Analyze my reviews",
            "Write a social media post",
            "Suggest improvements",
            "Create a promo image",
          ].map(prompt => (
            <button
              key={prompt}
              className="w-full text-left text-xs p-1.5 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors text-muted-foreground"
              onClick={() => {
                setInput(prompt);
                textareaRef.current?.focus();
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Chat header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">{businessName} AI Assistant</p>
            <p className="text-xs text-muted-foreground">Knows everything about your business</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold font-display text-lg mb-2">Your AI Business Assistant</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                I know everything about <strong>{businessName}</strong>. Ask me anything — from marketing advice to analyzing your reviews, or generate images for your business.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6 text-xs">
                {[
                  { icon: "💬", label: "Chat & Advice" },
                  { icon: "📊", label: "Review Analysis" },
                  { icon: "📸", label: "Image Generation" },
                  { icon: "✍️", label: "Content Writing" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 bg-muted/50 rounded-xl px-3 py-2 text-muted-foreground">
                    <span>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === "assistant"
                  ? "bg-gradient-to-br from-primary to-emerald-500"
                  : "bg-muted border border-border"
              }`}>
                {msg.role === "assistant"
                  ? <Bot className="w-3.5 h-3.5 text-white" />
                  : <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-muted/60 border border-border/50 rounded-tl-sm"
                }`}>
                  {msg.role === "assistant"
                    ? <MarkdownContent content={msg.content} />
                    : <p className="text-sm">{msg.content}</p>
                  }
                </div>
                {msg.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-border shadow-sm mt-1 max-w-xs">
                    <img src={msg.imageUrl} alt="AI generated" className="w-full" />
                    <div className="px-3 py-2 bg-muted/40 flex justify-end">
                      <a
                        href={msg.imageUrl}
                        download={`${businessName.toLowerCase().replace(/\s+/g, "-")}-ai-image.png`}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        Download image
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(streaming || generatingImage) && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-muted/60 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-2.5">
                {generatingImage ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wand2 className="w-4 h-4 animate-pulse text-primary" />
                    Generating your image…
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Image generation panel */}
        {showImagePanel && (
          <div className="mx-4 mb-2 p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-800">Generate Image</span>
              </div>
              <button onClick={() => setShowImagePanel(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") generateImage(); }}
                placeholder={`e.g. "A tropical storefront for ${businessName}"`}
                className="flex-1 text-sm border border-violet-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                autoFocus
              />
              <Button
                size="sm"
                onClick={generateImage}
                disabled={!imagePrompt.trim() || generatingImage}
                className="bg-violet-600 hover:bg-violet-700 rounded-xl gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Tip: You can also type "generate image of..." directly in the chat.
            </p>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2 items-end">
            <Button
              variant="outline"
              size="icon"
              className={`shrink-0 rounded-xl h-10 w-10 transition-colors ${showImagePanel ? "bg-violet-100 border-violet-300 text-violet-700" : "hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"}`}
              onClick={() => setShowImagePanel(!showImagePanel)}
              title="Generate image"
            >
              <ImagePlus className="w-4 h-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask anything about ${businessName}… or "generate image of a promo banner"`}
              className="flex-1 resize-none rounded-xl min-h-[42px] max-h-32 text-sm py-2.5"
              rows={1}
              disabled={streaming || generatingImage}
            />
            <Button
              size="icon"
              className="shrink-0 rounded-xl h-10 w-10"
              onClick={sendMessage}
              disabled={!input.trim() || streaming || generatingImage}
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Powered by AI • Knows your business data, reviews, and hours
          </p>
        </div>
      </div>
    </div>
  );
}
