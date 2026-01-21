import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BananaButton } from "../ui/BananaButton";
import { X, Save } from "lucide-react";
import type { UserRole } from "../../types";

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated?: () => void;
    userToEdit?: { uid: string, displayName: string, email: string, role: UserRole } | null;
}

export function CreateUserModal({ isOpen, onClose, onUserCreated, userToEdit }: CreateUserModalProps) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<UserRole>("site_super");
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Populate form when userToEdit changes
    useEffect(() => {
        if (userToEdit) {
            setEmail(userToEdit.email);
            setName(userToEdit.displayName);
            setRole(userToEdit.role);
            setInviteLink(null); // Reset invite link in edit mode
        } else {
            // Reset for create mode
            setEmail("");
            setName("");
            setRole("site_super");
            setInviteLink(null);
        }
    }, [userToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (userToEdit) {
                // UPDATE MODE
                const userRef = doc(db, "users", userToEdit.uid);
                await updateDoc(userRef, {
                    email: email.toLowerCase(),
                    displayName: name,
                    role: role
                });
                alert("User updated successfully!");
                if (onUserCreated) onUserCreated(); // Refresh or close
                onClose();
            } else {
                // CREATE MODE
                const q = query(collection(db, "users"), where("email", "==", email));
                const snap = await getDocs(q);
                if (!snap.empty) { alert("User exists!"); setLoading(false); return; }

                await addDoc(collection(db, "users"), {
                    email: email.toLowerCase(), displayName: name, role, status: 'invited', createdAt: serverTimestamp(), level: 1, currentXP: 0
                });

                setInviteLink(`${window.location.origin}/login?invite=${encodeURIComponent(email)}`);
                if (onUserCreated) onUserCreated();
            }
        } catch (error) { 
            console.error(error);
            alert("Error saving user."); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6">
                <div className="flex justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">{userToEdit ? "Edit Member" : "Add Member"}</h2>
                    <button onClick={onClose}><X className="text-zinc-500" /></button>
                </div>
                
                {inviteLink && !userToEdit ? (
                    <div className="text-center space-y-4">
                        <div className="p-3 bg-black/50 border border-zinc-800 rounded text-yellow-500 font-mono text-xs break-all">{inviteLink}</div>
                        <BananaButton onClick={onClose} className="w-full">Done</BananaButton>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="w-full bg-black border border-zinc-700 p-3 rounded text-white" required />
                        {/* Disable email edit if strict security needed, but per request usually they want to fix typos */}
                        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full bg-black border border-zinc-700 p-3 rounded text-white" required />
                        <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full bg-black border border-zinc-700 p-3 rounded text-white">
                            <option value="site_super">Site Supervisor</option>
                            <option value="architect">Architect</option>
                            <option value="accountant">Accountant</option>
                            <option value="founder">Founder</option>
                            <option value="client">Client</option>
                            <option value="sub_contractor">Sub-Contractor</option>
                        </select>
                        <BananaButton type="submit" isLoading={loading} className="w-full">
                            {userToEdit ? <><Save className="w-4 h-4 mr-2" /> Save Changes</> : "Generate Invite"}
                        </BananaButton>
                    </form>
                )}
            </div>
        </div>
    );
}
