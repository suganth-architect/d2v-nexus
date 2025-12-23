import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Project } from "../types";

export function useClientProjects(userEmail: string | undefined, userRole: string | undefined, userUid: string | undefined) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userEmail || !userRole) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const fetchProjects = async () => {
            try {
                let q;
                const projectsRef = collection(db, "projects");

                if (userRole === 'founder') {
                    // Founder sees ALL active projects
                    q = query(projectsRef, where("status", "==", "active"));
                } else if (userRole === 'client') {
                    // Client sees their projects (checking both email fields for safety)
                    // Unfortunately Firestore OR queries are restricted, so we stick to parallel
                    const q1 = query(projectsRef, where("clientEmail", "==", userEmail));
                    const q2 = query(projectsRef, where("client_email", "==", userEmail));
                    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

                    const found = new Map();
                    snap1.forEach((d) => found.set(d.id, { id: d.id, ...d.data() } as Project));
                    snap2.forEach((d) => found.set(d.id, { id: d.id, ...d.data() } as Project));

                    setProjects(Array.from(found.values()));
                    setLoading(false);
                    return; // Exit here for client

                } else {
                    // Everyone else (Architect, Site Super, PM, Accountant)
                    // Checks 'teamIds' array
                    if (!userUid) {
                        setProjects([]);
                        return;
                    }
                    q = query(projectsRef, where("teamIds", "array-contains", userUid));
                }

                // Execute for Founder / Team
                const snap = await getDocs(q);
                // @ts-ignore
                const data: Project[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));

                // Sort locally if needed (e.g. recent first) - though query sort is better if indexed
                // For now, simple sort
                // data.sort((a, b) => b.createdAt - a.createdAt);

                setProjects(data);

            } catch (err: any) {
                console.error("Error fetching projects:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [userEmail, userRole, userUid]);

    return { projects, loading, error };
}
