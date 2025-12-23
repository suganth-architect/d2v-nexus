import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, onSnapshot, serverTimestamp, runTransaction, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import { Send } from "lucide-react";

interface Comment {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    createdAt: any;
}

interface TaskCommentsProps {
    taskId: string;
    projectId: string;
    onClose?: () => void;
}

export function TaskComments({ taskId, projectId, onClose }: TaskCommentsProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    useEffect(() => {
        if (!taskId || !projectId) return;

        const q = query(
            collection(db, "projects", projectId, "tasks", taskId, "comments"),
            orderBy("createdAt", "asc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[];
            setComments(data);
        });

        return () => unsub();
    }, [taskId, projectId]);

    const handleSend = async () => {
        if (!newMessage.trim() || !user || sending) return;

        setSending(true);
        try {
            await runTransaction(db, async (transaction) => {
                const commentRef = doc(collection(db, "projects", projectId, "tasks", taskId, "comments"));
                const taskRef = doc(db, "projects", projectId, "tasks", taskId);

                // 1. READ FIRST: Get Parent Task
                const taskDoc = await transaction.get(taskRef);
                if (!taskDoc.exists()) throw "Task does not exist!";

                // 2. Write Comment
                transaction.set(commentRef, {
                    text: newMessage,
                    authorId: user.uid,
                    authorName: user.displayName || user.email || "Unknown",
                    createdAt: serverTimestamp()
                });

                // 3. Update Parent Count
                const currentCount = taskDoc.data().commentCount || 0;
                transaction.update(taskRef, {
                    commentCount: currentCount + 1
                });
            });

            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900 border border-zinc-700/50 rounded-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-300">Team Chat</h3>
                {onClose && (
                    <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white">
                        Close
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                {comments.length === 0 && (
                    <div className="text-center text-xs text-zinc-600 italic mt-10">
                        No messages yet. Start the conversation!
                    </div>
                )}

                {comments.map((msg) => {
                    const isMe = msg.authorId === user?.uid;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'}`}>
                                {!isMe && (
                                    <div className="text-[10px] font-bold text-zinc-500 mb-1">
                                        {msg.authorName}
                                    </div>
                                )}
                                {msg.text}
                                <div className={`text-[9px] mt-1 ${isMe ? 'text-blue-200' : 'text-zinc-500'} text-right`}>
                                    {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                        disabled={sending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="p-2 bg-yellow-500 rounded-full text-black hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
