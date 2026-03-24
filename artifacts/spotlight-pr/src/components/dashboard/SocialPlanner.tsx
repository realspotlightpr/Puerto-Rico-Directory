import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Loader2, Send,
  Key, Check, AlertCircle, X, Image as ImageIcon, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface SocialPlannerProps {
  businessId: number;
  businessName: string;
}

interface MediaItem {
  id: number;
  url: string;
  prompt?: string;
  createdAt: string;
}

interface ScheduledPost {
  id: string;
  post?: string;
  body?: string;
  scheduledAt?: string;
  status?: string;
  platforms?: string[];
}

export function SocialPlanner({ businessId, businessName }: SocialPlannerProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [postText, setPostText] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const hasApiKey = apiKeySet;

  const checkApiKeyStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/highlevel/status?businessId=${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeySet(data.hasApiKey);
        setShowSettings(!data.hasApiKey);
      }
    } catch {}
    finally { setCheckingStatus(false); }
  }, [businessId, getToken]);

  useEffect(() => { checkApiKeyStatus(); }, [checkApiKeyStatus]);

  const loadPosts = useCallback(async () => {
    if (!hasApiKey) return;
    setLoadingPosts(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/highlevel/posts?businessId=${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const arr = data.posts ?? data.data ?? (Array.isArray(data) ? data : []);
        setPosts(arr);
      }
    } catch {
      // silently ignore - HighLevel API may not be accessible
    } finally {
      setLoadingPosts(false);
    }
  }, [hasApiKey, businessId, getToken]);

  const loadMedia = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/media/items?businessId=${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.items ?? []);
      }
    } catch {}
  }, [businessId, getToken]);

  useEffect(() => { loadPosts(); }, [loadPosts]);
  useEffect(() => { loadMedia(); }, [loadMedia]);

  const saveApiKey = async () => {
    setIsSavingKey(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/highlevel/api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId, apiKey }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setApiKey("");
      setApiKeySet(true);
      setShowSettings(false);
      toast({ title: "API key saved!", description: "Your HighLevel connection is configured." });
      loadPosts();
    } catch {
      toast({ title: "Error", description: "Failed to save API key", variant: "destructive" });
    } finally {
      setIsSavingKey(false);
    }
  };

  const openComposer = (day: Date) => {
    setSelectedDay(day);
    setScheduledDate(format(day, "yyyy-MM-dd"));
    setPostText("");
    setSelectedImage(null);
    setComposerOpen(true);
  };

  const submitPost = async () => {
    if (!postText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const scheduledAt = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
        : undefined;

      const res = await fetch("/api/highlevel/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessId,
          text: postText,
          scheduledAt,
          imageUrl: selectedImage?.url,
          platforms: [],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to schedule post");
      }

      toast({ title: "Post scheduled!", description: "Your post has been sent to HighLevel for publishing." });
      setComposerOpen(false);
      loadPosts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to schedule post", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPostsForDay = (day: Date) => {
    return posts.filter(p => {
      if (!p.scheduledAt) return false;
      return isSameDay(new Date(p.scheduledAt), day);
    });
  };

  // Calendar generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  return (
    <div className="flex flex-col gap-6">
      {/* Settings Section */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold font-display text-foreground">Social Media Planner</h2>
              <p className="text-xs text-muted-foreground">Schedule posts via HighLevel</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-xl gap-2 text-xs"
          >
            <Key className="w-3.5 h-3.5" /> {apiKeySet ? "API Settings" : "Connect HighLevel"}
          </Button>
        </div>

        {showSettings && (
          <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-3">
            <p className="text-sm font-medium text-foreground">HighLevel Sub-Account API Key</p>
            <p className="text-xs text-muted-foreground">
              Enter your HighLevel Sub-Account API key to connect and schedule social posts. Find it in your HighLevel account under Settings → API Keys.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="hl_••••••••••••••••"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="rounded-xl flex-1 font-mono text-sm"
              />
              <Button
                onClick={saveApiKey}
                disabled={isSavingKey || !apiKey.trim()}
                className="rounded-xl gap-2 shrink-0"
              >
                {isSavingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </Button>
            </div>
            {apiKeySet && (
              <div className="flex items-center gap-2 text-emerald-700 text-xs">
                <Check className="w-3.5 h-3.5" /> API key configured
              </div>
            )}
          </div>
        )}

        {!hasApiKey && !showSettings && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>Connect your HighLevel account to start scheduling social media posts. Click "Connect HighLevel" above.</p>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-bold font-display text-lg text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding cells */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="h-20 rounded-xl" />
          ))}

          {/* Day cells */}
          {days.map(day => {
            const dayPosts = getPostsForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                onClick={() => openComposer(day)}
                className={`h-20 rounded-xl border p-1.5 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5 group ${
                  isToday ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className={`text-xs font-semibold mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 2).map((post, i) => (
                    <div key={i} className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate">
                      {post.post ?? post.body ?? "Post"}
                    </div>
                  ))}
                  {dayPosts.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayPosts.length - 2} more</div>
                  )}
                </div>
                {/* Add button on hover */}
                {dayPosts.length === 0 && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center mt-1">
                    <Plus className="w-4 h-4 text-primary/60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loadingPosts && (
          <div className="flex justify-center mt-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Post Composer Dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-primary" />
              {selectedDay ? `Schedule Post — ${format(selectedDay, "MMMM d, yyyy")}` : "Schedule Post"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {/* Post Text */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Post Content</label>
              <Textarea
                className="rounded-xl min-h-[120px] resize-none"
                placeholder={`What would you like to share about ${businessName}?`}
                value={postText}
                onChange={e => setPostText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">{postText.length} characters</p>
            </div>

            {/* Scheduled Date/Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Date</label>
                <Input
                  type="date"
                  className="rounded-xl"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Time</label>
                <Input
                  type="time"
                  className="rounded-xl"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            {/* Image Attachment */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Attach Image (optional)</label>
              {selectedImage ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={selectedImage.url} alt="" className="w-full h-32 object-cover" />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full rounded-xl gap-2 border-dashed"
                  onClick={() => setShowMediaPicker(true)}
                  disabled={mediaItems.length === 0}
                >
                  <ImageIcon className="w-4 h-4" />
                  {mediaItems.length === 0 ? "No images in Media Library" : "Choose from Media Library"}
                </Button>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setComposerOpen(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={submitPost}
                disabled={!postText.trim() || isSubmitting || !hasApiKey}
                className="flex-1 rounded-xl gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</>
                ) : (
                  <><Send className="w-4 h-4" /> Schedule Post</>
                )}
              </Button>
            </div>

            {!hasApiKey && (
              <p className="text-xs text-center text-muted-foreground">
                Connect your HighLevel account to schedule posts.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Picker Dialog */}
      <Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="text-base">Choose from Media Library</DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {mediaItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No images in your Media Library yet.</p>
                <p className="text-sm mt-1">Generate and save images in the Image Studio tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {mediaItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedImage(item); setShowMediaPicker(false); }}
                    className="relative rounded-xl overflow-hidden border border-border cursor-pointer hover:border-primary/60 hover:shadow-md transition-all group"
                  >
                    <img src={item.url} alt={item.prompt ?? ""} className="w-full aspect-square object-cover" />
                    {item.prompt && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-xs text-white truncate">{item.prompt}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
