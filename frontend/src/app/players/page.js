"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PlayerCombobox from "@/components/PlayerCombobox";

const API = "http://localhost:8000/api";

export default function PlayersIndexPage() {
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch(`${API}/players`)
      .then(r => r.json())
      .then(data => { setPlayers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSelect = (uniqueName) => {
    if (uniqueName) {
      setSelected(uniqueName);
      router.push(`/players/${encodeURIComponent(uniqueName)}`);
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-16" style={{ background: "var(--bg)" }}>
      <div className="max-w-xl mx-auto">

        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: "var(--txt)" }}>
            Player Profiles
          </h1>
          <p className="text-sm" style={{ color: "var(--txt-3)" }}>
            Search across {loading ? "…" : players.length.toLocaleString()} players from IPL, SA20 and T20Is
          </p>
        </div>

        <PlayerCombobox
          players={players}
          value={selected}
          onChange={handleSelect}
          placeholder="Search by name or country…"
          loading={loading}
        />

        {!loading && players.length > 0 && (
          <p className="text-center text-xs mt-4" style={{ color: "var(--txt-3)" }}>
            Select a player to view their full profile
          </p>
        )}
      </div>
    </div>
  );
}
