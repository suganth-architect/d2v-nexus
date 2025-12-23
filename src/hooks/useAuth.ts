import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface UserProfile {
    uid: string;
    email: string | null;
    role: "founder" | "site_super" | "client" | null;
    name: string;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // NUCLEAR BYPASS: Trust the Founder Email immediately
                if (firebaseUser.email === "founder@d2v.internal") {
                    console.log("useAuth: Founder Bypass Active");
                    setProfile({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: "The Founder",
                        role: "founder" // FORCE FOUNDER ROLE
                    });
                    setLoading(false);
                    return;
                }

                // Normal fetch for everyone else
                try {
                    const docRef = doc(db, "users", firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setProfile({ uid: firebaseUser.uid, ...docSnap.data() } as UserProfile);
                    } else {
                        setProfile({ uid: firebaseUser.uid, email: firebaseUser.email, role: "client", name: "Client" });
                    }
                } catch (e) {
                    console.error("Profile fetch error", e);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return { user, profile, loading };
}
