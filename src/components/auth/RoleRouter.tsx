import { Navigate } from "react-router-dom";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import { useClientProjects } from "../../hooks/useClientProjects";

export function RoleRouter() {
    const { profile, loading: authLoading } = useTitanAuth();
    // We fetch projects here to determine if we need to show selector or redirect directly
    // Note: useClientProjects handles "Wait if no profile" internal logic but we might pass undefined safely
    const { projects, loading: projectsLoading } = useClientProjects(profile?.email || undefined, profile?.role || undefined, profile?.uid || undefined);

    // 1. Loading State
    if (authLoading || (profile && projectsLoading)) {
        return <div className="h-screen w-full bg-black flex items-center justify-center text-yellow-500 font-mono tracking-widest animate-pulse">AUTHENTICATING IDENTITY...</div>;
    }

    // 2. Not Logged In
    if (!profile) return <Navigate to="/login" replace />;

    // Ensure role matches strict types or fallback strings
    const role = profile.role as string;

    switch (role) {
        case 'founder':
            return <Navigate to="/command/dashboard" replace />;

        case 'architect':
            return <Navigate to="/studio/dashboard" replace />;

        case 'site_super':
            return <Navigate to="/portal/site" replace />;

        case 'accountant':
            return <Navigate to="/portal/ledger" replace />;

        case 'client':
            // Explicitly redirect to the client access point
            return <Navigate to="/portal/client/portfolio" replace />;


        case 'sub_contractor':
            // 4. Project Selection Logic
            if (projects.length === 1) {
                return <Navigate to={`/portal/site/${projects[0].id}`} replace />;
            }
            if (projects.length > 1) {
                return <Navigate to="/portal/site" replace />; // The Selector Page
            }
            // 0 projects
            return <div className="h-screen w-full bg-black flex items-center justify-center text-white/50 font-mono">ACCESS DENIED. NO PROJECTS ASSIGNED.</div>;

        default:
            // Fallback
            return <Navigate to="/login" replace />; // or /onboarding
    }
}
