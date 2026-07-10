import { useEffect, useRef, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { Loader2, Send, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const threadId = (a: string, b: string) => [a, b].sort().join("__");

export default function Messages() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null); // other user id
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const toParam = params.get("to");

  const load = async (u: string) => {
    const { data } = await supabase.from("messages").select("*").or(`sender_id.eq.${u},recipient_id.eq.${u}`).order("created_at", { ascending: true });
    const list = data || [];
    setMsgs(list);
    const others = [...new Set(list.map((m: any) => (m.sender_id === u ? m.recipient_id : m.sender_id)))];
    if (toParam && !others.includes(toParam)) others.push(toParam);
    if (others.length) {
      const { data: us } = await supabase.from("users").select("id, first_name, last_name").in("id", others);
      setNames(Object.fromEntries((us || []).map((x: any) => [x.id, [x.first_name, x.last_name].filter(Boolean).join(" ") || "User"])));
    }
    if (toParam) setActive(toParam);
    else if (others.length && !active) setActive(others[0]);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setUid(user.id); await load(user.id); }
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, [isAuthenticated]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active, msgs]);

  const threads = uid ? [...new Set(msgs.map((m) => (m.sender_id === uid ? m.recipient_id : m.sender_id)))] : [];
  if (toParam && uid && !threads.includes(toParam)) threads.unshift(toParam);
  const convo = uid && active ? msgs.filter((m) => threadId(m.sender_id, m.recipient_id) === threadId(uid, active)) : [];

  const send = async () => {
    if (!uid || !active || !text.trim()) return;
    const body = text.trim();
    setText("");
    const optimistic = { id: Math.random(), sender_id: uid, recipient_id: active, body, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, optimistic]);
    await supabase.from("messages").insert({ thread_id: threadId(uid, active), sender_id: uid, recipient_id: active, body });
  };

  if (!isAuthenticated) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3"><MessageCircle className="w-10 h-10 text-primary" /><Button onClick={() => openAuthModal?.()}>Sign in to message</Button></div>;
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><MessageCircle className="w-6 h-6 text-primary" /> Messages</h1>
      <div className="grid md:grid-cols-3 gap-4 h-[70vh]">
        <div className={`md:col-span-1 bg-white border rounded-2xl overflow-y-auto ${active ? "hidden md:block" : ""}`}>
          {threads.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p> : threads.map((t) => (
            <button key={t} onClick={() => setActive(t)} className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 ${active === t ? "bg-muted/60" : ""}`}>
              <p className="font-semibold text-sm">{names[t] || "User"}</p>
            </button>
          ))}
        </div>
        <div className="md:col-span-2 bg-white border rounded-2xl flex flex-col">
          {!active ? <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation</div> : (
            <>
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <button className="md:hidden" onClick={() => setActive(null)}><ArrowLeft className="w-5 h-5" /></button>
                <p className="font-semibold">{names[active] || "User"}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {convo.map((m) => (
                  <div key={m.id} className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === uid ? "ml-auto bg-primary text-white" : "bg-muted"}`}>{m.body}</div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Type a message…" />
                <Button onClick={send} className="gap-1"><Send className="w-4 h-4" /></Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
