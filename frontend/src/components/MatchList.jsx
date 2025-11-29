// src/components/MatchList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // <a> yerine <Link> kullanacağız
import '../css/matchList.css'; // Ana App.css stilini kullanır

function MatchList() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Sabit ID'ler (eski HTML'deki gibi)
    const compId = 0;
    const seasonId = 0;

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const response = await fetch(`https://localhost:7148/api/Matches/${compId}/${seasonId}`);
                if (!response.ok) {
                    throw new Error(`Veri çekilemedi: ${response.status}`);
                }
                const data = await response.json();
                setMatches(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchMatches();
    }, [compId, seasonId]); // compId veya seasonId değişirse (gelecekte) yeniden çeker

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Maçlar yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-card">
                <h3>Hata Oluştu</h3>
                <p>{error}</p>
                 <small>API sunucunuzun (https://localhost:7148) çalıştığından ve CORS ayarlarının doğru olduğundan emin olun.</small>
            </div>
        );
    }

    return (
        <div className="match-list-container">
            <h2 className="match-list-header">⚽ Maç Sonuçları</h2>
            {matches.map(match => (
                <div className="match-row" key={match.match_id}>
                    <div className="team-name-list team-home">
                        {match.home_team.home_team_name}
                    </div>
                    <div className="score-list">
                        {match.home_score} - {match.away_score}
                    </div>
                    <div className="team-name-list team-away">
                        {match.away_team.away_team_name}
                    </div>
                    
                    {/* Yönlendirme: /match/:compId/:seasonId/:matchId */}
                    <Link 
                        to={`/match/${compId}/${seasonId}/${match.match_id}`} 
                        className="detail-link"
                    >
                        Detayları Gör
                    </Link>
                </div>
            ))}
        </div>
    );
}

export default MatchList;