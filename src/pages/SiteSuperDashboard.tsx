import { BananaCard } from "../components/ui/BananaCard";
// import { BananaButton } from "../components/ui/BananaButton";

export function SiteSuperDashboard() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Field Operations</h1>

            <div className="grid grid-cols-1 gap-4">
                <BananaCard className="active:scale-95 transition-transform bg-zinc-800/80">
                    <div className="text-center py-6">
                        <div className="text-6xl mb-4">📸</div>
                        <h3 className="text-xl font-bold text-yellow-400">Log Site Photo</h3>
                        <p className="text-zinc-400 text-sm mt-2">Upload progress photos</p>
                    </div>
                </BananaCard>

                <BananaCard className="active:scale-95 transition-transform bg-zinc-800/80">
                    <div className="text-center py-6">
                        <div className="text-6xl mb-4">👷</div>
                        <h3 className="text-xl font-bold text-yellow-400">Labor Count</h3>
                        <p className="text-zinc-400 text-sm mt-2">Check-in active workers</p>
                    </div>
                </BananaCard>

                <BananaCard className="active:scale-95 transition-transform bg-zinc-800/80">
                    <div className="text-center py-6">
                        <div className="text-6xl mb-4">💰</div>
                        <h3 className="text-xl font-bold text-white">My Wallet</h3>
                        <p className="text-zinc-400 text-sm mt-2">View petty cash balance</p>
                    </div>
                </BananaCard>
            </div>
        </div>
    );
}
