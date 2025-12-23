import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Notification } from '../types';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    userId: string;
}

export function NotificationCenter({ isOpen, onClose, notifications, userId }: NotificationCenterProps) {
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    const markAsRead = async (notification: Notification) => {
        if (notification.read) return;
        try {
            await updateDoc(doc(db, `users/${userId}/notifications`, notification.id), {
                read: true
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        try {
            const batch = writeBatch(db);
            unread.forEach(note => {
                const ref = doc(db, `users/${userId}/notifications`, note.id);
                batch.update(ref, { read: true });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await markAsRead(notification);
        }
        onClose();
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
                    />

                    {/* Drawer Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 w-80 bg-zinc-950 border-l border-zinc-800 shadow-2xl z-[100] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-yellow-500" />
                                    Notifications
                                </h2>
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-yellow-500/80 hover:text-yellow-400 mt-1 flex items-center gap-1 transition-colors"
                                    >
                                        <CheckCheck className="w-3 h-3" />
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                                        <Bell className="w-8 h-8 opacity-20" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium text-zinc-400">All caught up</p>
                                        <p className="text-xs text-zinc-600 mt-1">No new notifications</p>
                                    </div>
                                </div>
                            ) : (
                                notifications.map((note) => (
                                    <motion.div
                                        layout
                                        key={note.id}
                                        onClick={() => handleNotificationClick(note)}
                                        className={`
                                            relative p-4 rounded-xl border cursor-pointer transition-all group
                                            ${note.read
                                                ? 'bg-transparent border-transparent hover:bg-zinc-900/50 text-zinc-500'
                                                : 'bg-zinc-900/30 border-l-4 border-l-yellow-500 border-y-zinc-800 border-r-zinc-800 hover:bg-zinc-900'
                                            }
                                        `}
                                    >
                                        <p className={`text-sm mb-2 font-medium ${note.read ? 'text-zinc-500' : 'text-white'}`}>
                                            {note.message}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-zinc-600">
                                            <span>
                                                {note.timestamp?.toDate ? note.timestamp.toDate().toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'Just now'}
                                            </span>
                                            {note.link && (
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
