import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";

export function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // Auth state listener in App.tsx or useAuth will handle redirect, 
            // but we can also push to dashboard directly for perceived speed.
            navigate("/");
        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.message || "Failed to sign in");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
            {/* Background Ambient Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[128px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]" />

            <div className="relative z-10 w-full max-w-md p-6">
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50 text-center">
                    {/* Logo/Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                        <span className="text-2xl font-black text-zinc-950">T</span>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        D2V <span className="text-yellow-400">TITAN</span>
                    </h1>
                    <p className="text-zinc-400 mb-8 text-sm">
                        Enterprise Operating System
                    </p>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full py-4 px-6 bg-white text-zinc-950 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-yellow-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                        ) : (
                            <>
                                <ShieldCheck className="w-5 h-5 text-zinc-700 group-hover:text-black transition-colors" />
                                <span>Sign In as Founder</span>
                            </>
                        )}
                    </button>

                    <div className="mt-8 text-xs text-zinc-600">
                        Protected by Titan Security Layer v3.0
                    </div>
                </div>
            </div>
        </div>
    );
}
