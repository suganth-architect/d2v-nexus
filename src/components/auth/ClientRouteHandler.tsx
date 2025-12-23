
import { Navigate } from "react-router-dom";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import { useClientProjects } from "../../hooks/useClientProjects";

export const ClientRouteHandler = () => {
    const { profile } = useTitanAuth();
    // Pass profile role and uid to new signature
    const { projects, loading } = useClientProjects(profile?.email || undefined, profile?.role || undefined, profile?.uid || undefined);

    if (loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                {/* Premium Glass Spinner Concept */}
                <div className="relative flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-yellow-400 rounded-full animate-spin backdrop-blur-md shadow-[0_0_30px_rgba(250,204,21,0.2)]" />
                    <div className="text-yellow-500/80 font-mono text-sm tracking-widest animate-pulse">
                        SECURE LINK ESTABLISHED
                    </div>
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="h-screen w-full bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome to Titan</h2>
                    <p className="text-white/60 mb-6">No active projects are currently linked to this email address ({profile?.email}).</p>
                    <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                        Please contact your Titan Project Manager to link your account.
                    </div>
                </div>
            </div>
        );
    }

    if (projects.length === 1) {
        return <Navigate to={`/portal/client/${projects[0].id}`} replace />;
    }

    // Multiple Projects -> Portfolio Grid
    return <Navigate to="/portal/client/portfolio" replace />;
};
