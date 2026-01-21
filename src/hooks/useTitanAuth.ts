import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, collection, query, where, getDocs, deleteDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

export interface UserProfile {
    uid: string;
    email: string | null;
    role: "founder" | "site_super" | "client" | "sub_contractor" | "architect" | "accountant" | null;
    name: string;
    companyName?: string;
    photoURL?: string | null;
}

// 🔐 THE SKELETON KEY LIST
const FOUNDER_EMAILS = [
    "founder@d2v.internal",
    "luckysuganth@gmail.com",
    "thar26un@gmail.com"
    // "dotstovolumes@gmail.com" <-- REMOVED!
];

export function useTitanAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. AUTH STATE (Firebase Auth)
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
            setUser(firebaseUser);
            if (!firebaseUser) {
                setProfile(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. PROFILE SYNC (Firestore Real-time)
    useEffect(() => {
        if (!user) return;

        // A. GOD MODE BYPASS (The Skeleton Key) - Static Override
        const email = user.email?.toLowerCase();
        if (email && FOUNDER_EMAILS.includes(email)) {
            console.log("👑 GOD MODE: Skeleton Key Active for", user.email);
            // We still listen to DB to respect 'name' or 'companyName' updates if any, 
            // BUT we force role='founder'.
        }

        const userRef = doc(db, "users", user.uid);

        const unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Merge Auth Data + DB Data
                const finalProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email,
                    name: data.displayName || user.displayName || "Titan User",
                    role: (user.email && FOUNDER_EMAILS.includes(user.email.toLowerCase())) ? "founder" : (data.role || "viewer"), // FORCE FOUNDER if in list
                    companyName: data.companyName,
                    photoURL: data.photoURL || user.photoURL
                };
                setProfile(finalProfile);
                setLoading(false);
            } else {
                // MIRROR IDENTITY: If not in DB, check Invites or Create
                // Use the previous logic but inside this flow?
                // Actually, if doc doesn't exist, we should try to create it ONE OFF.
                // But onSnapshot fires on empty too if we handle it.
                // Let's keep it simple: If not found, try to find invite or create default.

                // 3. INVITE CHECK (Identity Merge)
                const q = query(collection(db, "users"), where("email", "==", user.email));
                const inviteSnap = await getDocs(q);

                if (!inviteSnap.empty) {
                    const inviteDoc = inviteSnap.docs[0];
                    const inviteData = inviteDoc.data();
                    const newProfile: UserProfile = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || inviteData.displayName || "User",
                        role: inviteData.role || "client",
                        companyName: inviteData.companyName || null,
                        photoURL: user.photoURL
                    };
                    // Atomic Identity Swap
                    await setDoc(userRef, { ...newProfile, createdAt: serverTimestamp() });
                    await deleteDoc(doc(db, "users", inviteDoc.id));
                    // The snapshot listener will fire again instantly after setDoc, updating the state.
                } else {
                    // 4. FALLBACK (Auto-Create)
                    // 4. FALLBACK (Auto-Create)
                    // Only create if we are sure? Or just set local state?
                    // Let's set local state to avoid writing garbage to DB if not needed. 
                    // But dashboard auto-repairs ghost users.
                    setProfile(finalProfileFromFallback(user));
                    setLoading(false);
                }
            }
        }, (error) => {
            console.error("Profile Sync Error:", error);
            setLoading(false);
        });

        return () => unsubscribeProfile();
    }, [user]);

    return { user, profile, loading };
}

const finalProfileFromFallback = (user: User): UserProfile => ({
    uid: user.uid,
    email: user.email,
    role: (user.email && FOUNDER_EMAILS.includes(user.email.toLowerCase())) ? "founder" : "client",
    name: user.displayName || "Guest"
});
