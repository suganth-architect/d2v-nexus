import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase"; // Ensure storage is exported from firebase lib
import { useAuth } from "../../hooks/useAuth";
import { grantXP } from "../../lib/gamification";
import { BananaCard } from "../../components/ui/BananaCard";
import { BananaButton } from "../../components/ui/BananaButton";
import { Camera, Image as ImageIcon, X, Loader2, CheckCircle2 } from "lucide-react";
import type { SiteLog } from "../../types";

export function SiteLogsTab({ projectId }: { projectId: string }) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data State
    const [logs, setLogs] = useState<SiteLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Staging State (Batch)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    // Form State
    const [batchDescription, setBatchDescription] = useState("");
    const [isVisibleToClient, setIsVisibleToClient] = useState(false);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    useEffect(() => {
        const q = query(
            collection(db, "projects", projectId, "site_logs"),
            orderBy("timestamp", "desc")
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SiteLog));
            setLogs(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [projectId]);

    // Cleanup previews to avoid memory leaks
    useEffect(() => {
        return () => {
            previews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [previews]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            // Generate Previews
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));

            setSelectedFiles(prev => [...prev, ...newFiles]);
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            const urlToRemove = prev[index];
            URL.revokeObjectURL(urlToRemove); // Cleanup
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleBatchUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        setUploadProgress("Initiating upload...");

        try {
            const uploadPromises = selectedFiles.map(async (file, index) => {
                setUploadProgress(`Uploading ${index + 1}/${selectedFiles.length}...`);

                // 1. Upload Image
                const timestamp = Date.now();
                const storageRef = ref(storage, `projects/${projectId}/logs/${timestamp}_${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);

                // 2. Add Doc
                await addDoc(collection(db, "projects", projectId, "site_logs"), {
                    imageUrl: downloadURL,
                    description: batchDescription, // All share the same description
                    isPublic: isVisibleToClient,
                    timestamp: serverTimestamp(),
                    authorUid: user?.uid || "unknown"
                });
            });

            await Promise.all(uploadPromises);

            // Grant XP (Once per batch or per image? Let's do once per batch to avoid spam for now, or per image capped)
            // Let's do 50XP * count
            if (user?.uid) {
                await grantXP(user.uid, 50 * selectedFiles.length, "Posted Site Logs");
            }

            // Reset
            setSelectedFiles([]);
            setPreviews([]);
            setBatchDescription("");
            setIsVisibleToClient(false);
            setUploadProgress("Done!");

        } catch (error) {
            console.error("Batch upload failed:", error);
            alert("Failed to upload some images. See console.");
        } finally {
            setIsUploading(false);
            setUploadProgress("");
        }
    };

    if (loading) return <div className="text-zinc-500 text-center py-10 animate-pulse">Syncing Site Logs...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">

            {/* STAGING ENGINE */}
            <BananaCard className="overflow-visible">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Camera className="w-5 h-5 text-yellow-500" />
                        Field Camera
                    </h3>
                    <span className="text-xs text-zinc-500 font-mono tracking-wider">BATCH V1.0</span>
                </div>

                <form onSubmit={handleBatchUpload} className="space-y-6">

                    {/* 1. TRIGGER ZONE */}
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {selectedFiles.length === 0 ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-48 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-yellow-500/50 transition-all group flex flex-col items-center justify-center gap-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-yellow-500 group-hover:scale-110 transition-all duration-300">
                                <Camera className="w-8 h-8 text-zinc-400 group-hover:text-black" />
                            </div>
                            <div className="text-center">
                                <p className="text-zinc-300 font-bold text-lg group-hover:text-white">Tap to Snap or Select</p>
                                <p className="text-zinc-500 text-sm">Multiple photos supported</p>
                            </div>
                        </button>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {/* STAGING GRID */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {previews.map((url, idx) => (
                                    <div key={url} className="relative aspect-square group rounded-xl overflow-hidden border border-zinc-700 bg-black">
                                        <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(idx)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/90 text-white rounded-full backdrop-blur-md transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {/* Add More Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-yellow-500 hover:bg-zinc-800 flex flex-col items-center justify-center gap-2 transition-all"
                                >
                                    <ImageIcon className="w-6 h-6 text-zinc-500" />
                                    <span className="text-xs text-zinc-500 font-bold">ADD MORE</span>
                                </button>
                            </div>

                            {/* BATCH META */}
                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-4">
                                <textarea
                                    value={batchDescription}
                                    onChange={(e) => setBatchDescription(e.target.value)}
                                    placeholder="Describe this batch (e.g., 'Foundation reinforcement complete...')"
                                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 h-24 resize-none placeholder:text-zinc-600"
                                />

                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="publicToggle"
                                            checked={isVisibleToClient}
                                            onChange={(e) => setIsVisibleToClient(e.target.checked)}
                                            className="w-5 h-5 rounded bg-zinc-800 border-zinc-600 text-yellow-500 focus:ring-yellow-500"
                                        />
                                        <label htmlFor="publicToggle" className="text-sm text-zinc-300 font-medium">Visible to Client</label>
                                    </div>

                                    <BananaButton
                                        type="submit"
                                        disabled={isUploading}
                                        className="w-40"
                                    >
                                        {isUploading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {uploadProgress || "Uploading..."}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Upload Batch
                                            </span>
                                        )}
                                    </BananaButton>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </BananaCard>

            <div className="flex items-center gap-4 py-4">
                <div className="h-px bg-zinc-800 flex-1" />
                <span className="text-xs font-mono text-zinc-600 uppercase">Live Site Feed</span>
                <div className="h-px bg-zinc-800 flex-1" />
            </div>

            {/* FEED GALLERY (MASONRY-ISH GRID) */}
            {logs.length === 0 ? (
                <div className="text-center text-zinc-500 py-10 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                    <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p>No site logs yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {logs.map(log => (
                        <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:border-zinc-700 group">
                            <div className="relative aspect-video bg-black overflow-hidden">
                                <img
                                    src={log.imageUrl}
                                    alt="Site Log"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    loading="lazy"
                                />
                                {log.isPublic && (
                                    <div className="absolute top-3 right-3 px-2 py-1 bg-green-500/90 backdrop-blur-sm text-black text-[10px] font-bold uppercase rounded-md shadow-lg border border-white/20">
                                        Client Visible
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <p className="text-xs text-white/70 font-mono">
                                        ID: {log.id.slice(0, 8)}
                                    </p>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{log.description}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-[10px] font-bold text-black border border-white/10">
                                            {log.authorUid.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-xs text-zinc-500">
                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono text-zinc-600">
                                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
