import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { BananaButton } from "../components/ui/BananaButton";
import { BananaCard } from "../components/ui/BananaCard";

export function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            console.error(err);
            setError("Login failed. Check console." + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <BananaCard className="w-full max-w-md">
                <h1 className="text-2xl font-bold text-center mb-6 text-white">D2V <span className="text-yellow-400">TITAN</span></h1>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                        <input
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="founder@d2v.internal"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm">{error}</div>}

                    <BananaButton type="submit" className="w-full justify-center">Enter Titan</BananaButton>
                </form>

                <div className="mt-4 text-center text-xs text-zinc-500">
                    Hint: Use <code>founder@d2v.internal</code>
                </div>
            </BananaCard>
        </div>
    );
}
