
import { BananaCard } from "../ui/BananaCard";
import { Check, Circle } from "lucide-react";

export function PaymentStagesList() {
    // Mock data for now, aiming to match "Timeline of money"
    const stages = [
        { id: 1, name: "Mobilization Advance", amount: 500000, status: "paid", date: "Oct 12" },
        { id: 2, name: "Plinth Level", amount: 1200000, status: "paid", date: "Nov 05" },
        { id: 3, name: "Ground Floor Slab", amount: 1500000, status: "pending", date: "Due Dec 15" },
        { id: 4, name: "First Floor Slab", amount: 1500000, status: "locked", date: "Jan 20" },
    ];

    return (
        <BananaCard className="p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">Payment Timeline</h3>
            <div className="space-y-4">
                {stages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${stage.status === 'paid' ? 'bg-green-500/20 border-green-500 text-green-500' : stage.status === 'pending' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                                {stage.status === 'paid' ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </div>
                            {idx !== stages.length - 1 && <div className="w-px h-8 bg-zinc-800 my-1"></div>}
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-medium ${stage.status === 'locked' ? 'text-zinc-500' : 'text-white'}`}>{stage.name}</h4>
                            <p className="text-xs text-zinc-500">{stage.date}</p>
                        </div>
                        <div className={`font-mono text-sm ${stage.status === 'paid' ? 'text-green-400' : 'text-zinc-400'}`}>
                            ₹{stage.amount.toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </BananaCard>
    );
}
