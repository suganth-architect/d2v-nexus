import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BananaButton } from "../../components/ui/BananaButton";
import { CheckCircle, HelpCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface RFI {
    id: string;
    question: string;
    status: 'pending' | 'resolved';
    decision?: string;
    askedBy: string;
    createdAt: any;
    resolvedAt?: any;
}

export function DecisionsTab({ projectId }: { projectId: string }) {
    const { user } = useAuth();
    const [rfis, setRfis] = useState<RFI[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAsking, setIsAsking] = useState(false);

    // Form State
    const [question, setQuestion] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Resolve State
    const [resolveId, setResolveId] = useState<string | null>(null);
    const [decisionText, setDecisionText] = useState("");

    useEffect(() => {
        const q = query(
            collection(db, "projects", projectId, "rfis"),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RFI[];
            setRfis(data);
            setLoading(false);
        });

        return () => unsub();
    }, [projectId]);

    const handleAskQuestion = async () => {
        if (!question.trim() || !user) return;
        setSubmitting(true);
        try {
            await addDoc(collection(db, "projects", projectId, "rfis"), {
                question: question,
                status: 'pending',
                askedBy: user.uid,
                createdAt: serverTimestamp()
            });
            setQuestion("");
            setIsAsking(false);
        } catch (error) {
            console.error("Failed to ask question", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolve = async (rfiId: string) => {
        if (!decisionText.trim()) return;
        try {
            await updateDoc(doc(db, "projects", projectId, "rfis", rfiId), {
                status: 'resolved',
                decision: decisionText,
                resolvedAt: serverTimestamp()
            });
            setResolveId(null);
            setDecisionText("");
        } catch (error) {
            console.error("Failed to resolve RFI", error);
        }
    };

    if (loading) return <div className="text-zinc-500 text-center py-10">Syncing Intelligence...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-yellow-500" />
                        Decisions & RFIs
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">Track questions, answers, and critical decisions.</p>
                </div>
                <BananaButton
                    onClick={() => setIsAsking(!isAsking)}
                    variant={isAsking ? "secondary" : "primary"}
                >
                    {isAsking ? "Cancel" : "Ask Question"}
                </BananaButton>
            </div>

            {/* Ask Question Form */}
            {isAsking && (
                <div className="bg-zinc-900 border border-yellow-500/20 rounded-xl p-4 mb-8 animate-in slide-in-from-top-4">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Your Question</label>
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="e.g. Should we use the 600mm or 800mm tiles for the master bath?"
                        className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 min-h-[100px]"
                    />
                    <div className="flex justify-end mt-4">
                        <BananaButton onClick={handleAskQuestion} isLoading={submitting}>
                            Submit RFI
                        </BananaButton>
                    </div>
                </div>
            )}

            {/* RFI Feed */}
            <div className="space-y-4">
                {rfis.length === 0 && !isAsking && (
                    <div className="text-center py-12 border-2 border-dashed border-zinc-900 rounded-xl">
                        <p className="text-zinc-600">No pending questions. The mission is clear.</p>
                    </div>
                )}

                {rfis.map(rfi => (
                    <div
                        key={rfi.id}
                        className={`
                            relative rounded-xl border p-5 transition-all
                            ${rfi.status === 'resolved'
                                ? 'bg-green-500/5 border-green-500/30'
                                : 'bg-zinc-900/40 border-zinc-800 hover:border-yellow-500/30'
                            }
                        `}
                    >
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${rfi.status === 'resolved' ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'}`}>
                                        {rfi.status}
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        {rfi.createdAt?.toDate().toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-medium text-zinc-200">{rfi.question}</h3>

                                {rfi.status === 'resolved' && (
                                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold mb-1">
                                            <CheckCircle className="w-3 h-3" /> OFFICIAL DECISION
                                        </div>
                                        <p className="text-zinc-300 text-sm">{rfi.decision}</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {rfi.status === 'pending' && (
                                <div className="flex-shrink-0">
                                    <button
                                        onClick={() => setResolveId(resolveId === rfi.id ? null : rfi.id)}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                                    >
                                        {resolveId === rfi.id ? "Cancel" : "Resolve"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Resolve Input */}
                        {resolveId === rfi.id && (
                            <div className="mt-4 pt-4 border-t border-zinc-800 animate-in fade-in">
                                <label className="text-xs font-bold text-zinc-400 uppercase">The Answer / Decision</label>
                                <textarea
                                    value={decisionText}
                                    onChange={(e) => setDecisionText(e.target.value)}
                                    placeholder="e.g. Use the 600mm tiles."
                                    className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-green-500 min-h-[80px]"
                                />
                                <div className="flex justify-end mt-2">
                                    <BananaButton
                                        onClick={() => handleResolve(rfi.id)}
                                        className="bg-green-600 hover:bg-green-500 border-green-500 text-white"
                                    >
                                        Confirm Decision
                                    </BananaButton>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
