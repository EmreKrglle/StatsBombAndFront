// src/components/MatchDetail.jsx - Pass Animasyon Entegrasyonlu
import React, { useState, useEffect } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import MatchStats from "./MatchStats";
import FormationPitch from "./formationPitch";
import DirectFreezeFrameController from "./DirectFreezeFrameController"; // YENİ - BASIT
import PositionGroupedController from "./PositionGroupedController"; // YENİ - POZİSYON BAZLI
import "../css/matchDetail.css";

// StatBox bileşeni
function StatBox({ value, label }) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? "-"
      : typeof value === "number" && !Number.isInteger(value)
      ? value.toFixed(2).replace(/\.?0+$/, "")
      : value;
  return (
    <div className="stat-box">
      <p className="stat-value">{displayValue}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

// Ana Bileşen
function MatchDetail() {
  const { compId, seasonId, matchId } = useParams();
  const [matchData, setMatchData] = useState(null);
  const [lineupData, setLineupData] = useState(null);
  const [matchStatsData, setMatchStatsData] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSidebar, setLoadingSidebar] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState("");
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [activePlayer, setActivePlayer] = useState(null);

  // YENİ: Pass animasyon state'leri - BASITLEŞTIRILDI
  const [showPassAnimation, setShowPassAnimation] = useState(false);
  const [buildUpRawData, setBuildUpRawData] = useState(null); // Ham veri direkt
  const [animatedPositions, setAnimatedPositions] = useState({});
  const [passArrows, setPassArrows] = useState([]);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [usePositionGrouped, setUsePositionGrouped] = useState(true); // Yeni: Pozisyon bazlı kontrolcü kullan

  useEffect(() => {
    const fetchAllMatchData = async () => {
      setLoading(true);
      setError(null);
      setPlayerStats(null);
      setActivePlayer(null);
      setShowPlayerStats(false);

      try {
        const matchDetailUrl = `https://localhost:7148/api/Matches/${compId}/${seasonId}/${matchId}`;
        const lineupUrl = `https://localhost:7148/api/LineUp/${matchId}`;
        const matchStatsUrl = `https://localhost:7148/api/MatchStats/${matchId}`;

        const [matchDetailResponse, lineupResponse, matchStatsResponse] =
          await Promise.all([
            fetch(matchDetailUrl),
            fetch(lineupUrl),
            fetch(matchStatsUrl),
          ]);

        if (!matchDetailResponse.ok)
          throw new Error(`Maç detayı: ${matchDetailResponse.status}`);
        if (!lineupResponse.ok)
          throw new Error(`Kadro: ${lineupResponse.status}`);
        if (!matchStatsResponse.ok)
          throw new Error(`İstatistik: ${matchStatsResponse.status}`);

        const matchStatsResult = await matchStatsResponse.json();
        setMatchData(await matchDetailResponse.json());
        setLineupData(await lineupResponse.json());
        setMatchStatsData(
          Array.isArray(matchStatsResult)
            ? matchStatsResult[0]
            : matchStatsResult || null
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMatchData();
  }, [compId, seasonId, matchId]);

  // YENİ: Build-up verilerini çek - BASIT
  const fetchBuildUpSequences = async (teamId) => {
    setLoadingSequences(true);
    try {
      const response = await fetch(
        `https://localhost:7148/api/BuildUp/${matchId}/${teamId}`
      );
      if (!response.ok) throw new Error('Build-up verileri alınamadı');
      
      const rawData = await response.json();
      console.log('📦 API Response:', rawData);
      
      // Veriyi kaydet - component detaylı parse edecek
      setBuildUpRawData(rawData);
      setShowPassAnimation(true);
    } catch (err) {
      console.error('❌ Hata:', err);
      alert('Build-up verileri yüklenemedi: ' + err.message);
    } finally {
      setLoadingSequences(false);
    }
  };

  // YENİ: Freeze frame callback'leri
  const handleFrameUpdate = (allPositions) => {
    // Freeze frame'deki TÜM oyuncu pozisyonlarını güncelle
    setAnimatedPositions(allPositions);
  };

  const handlePassDraw = ({ from, to }) => {
    setPassArrows([{ 
      from, 
      to, 
      fromTeam: 'home', 
      toTeam: 'home' 
    }]);
    
    setTimeout(() => {
      setPassArrows([]);
    }, 1200);
  };

  const closePassAnimation = () => {
    setShowPassAnimation(false);
    setAnimatedPositions({});
    setPassArrows([]);
    setBuildUpRawData(null); // Ham veriyi temizle
  };

  const loadPlayerStats = async (playerId, playerName) => {
    setLoadingSidebar(true);
    setSelectedPlayerName(playerName);
    setPlayerStats(null);
    setShowPlayerStats(true);
    setActivePlayer(playerId);

    try {
      const response = await fetch(
        `https://localhost:7148/api/PlayerStats/${matchId}/${playerId}`
      );
      if (response.status === 404) throw new Error("İstatistik hesaplanmamış.");
      if (!response.ok) throw new Error(`Hata: ${response.status}`);

      let stats = await response.json();
      stats = Array.isArray(stats) ? stats[0] : stats;
      setPlayerStats(stats);
    } catch (err) {
      setPlayerStats({ error: err.message });
    } finally {
      setLoadingSidebar(false);
    }
  };

  const renderSidebarContent = () => {
    if (!showPlayerStats) return null;

    if (loadingSidebar) {
      return (
        <>
          <button
            className="close-sidebar-btn"
            onClick={() => setShowPlayerStats(false)}
          >
            ×
          </button>
          <div className="stats-title">Oyuncu İstatistikleri</div>
          <div className="stats-player-name">{selectedPlayerName}</div>
          <div className="stats-placeholder">
            <div className="spinner"></div>
            <p>Yükleniyor...</p>
          </div>
        </>
      );
    }

    if (playerStats?.error) {
      return (
        <>
          <button
            className="close-sidebar-btn"
            onClick={() => setShowPlayerStats(false)}
          >
            ×
          </button>
          <div className="stats-title">Oyuncu İstatistikleri</div>
          <div className="stats-player-name">{selectedPlayerName}</div>
          <div className="stats-placeholder" style={{ color: "#e74c3c" }}>
            Hata: {playerStats.error}
          </div>
        </>
      );
    }

    if (!playerStats)
      return (
        <>
          <button
            className="close-sidebar-btn"
            onClick={() => setShowPlayerStats(false)}
          >
            ×
          </button>
          <div className="stats-title">Oyuncu İstatistikleri</div>
          <div className="stats-player-name">{selectedPlayerName}</div>
          <p className="stats-placeholder">
            Oyuncunun istatistikleri bulunamadı.
          </p>
        </>
      );

    const s = playerStats;
    const shot = s.shot || {};
    const pass = s.pass || {};
    const dribble = s.dribble || {};
    const duel = s.duel || {};
    const interception = s.interception || {};
    const gk = s.goalkeeper || {};

    const isGoalkeeper = gk.saves_total !== undefined;

    return (
      <>
        <button
          className="close-sidebar-btn"
          onClick={() => setShowPlayerStats(false)}
        >
          ×
        </button>
        <div className="stats-title">Oyuncu İstatistikleri</div>
        <div className="stats-player-name">{selectedPlayerName}</div>

        {isGoalkeeper ? (
          <>
            <div className="stats-section">
              <div className="section-header">Kurtarışlar</div>
              <StatBox value={gk.saves_total} label="Toplam Kurtarış" />
              <StatBox value={gk.saves_penalty} label="Penaltı Kurtarış" />
              <StatBox value={gk.saves_caught} label="Yakalanan" />
              <StatBox
                value={gk.saves_parried_safe + gk.saves_parried_danger}
                label="Çelinen"
              />
            </div>

            <div className="stats-section">
              <div className="section-header">Karşılaşma & xG</div>
              <StatBox value={gk.shots_faced_on_target} label="İsabetli Şut" />
              <StatBox value={gk.goals_conceded} label="Yediği Gol" />
              <StatBox value={gk.psxg_faced} label="PSxG (Karşılaşılan)" />
            </div>

            <div className="stats-section">
              <div className="section-header">Top Dağıtımı</div>
              <StatBox value={gk.passes_attempted} label="Pas Denemesi" />
              <StatBox value={gk.passes_completed} label="Başarılı Pas" />
              <StatBox
                value={
                  gk.passes_attempted > 0
                    ? (
                        (gk.passes_completed / gk.passes_attempted) *
                        100
                      ).toFixed(1)
                    : 0
                }
                label="Pas Başarı %"
              />
            </div>
          </>
        ) : (
          <>
            <div className="stats-section">
              <div className="section-header">Şut & Gol</div>
              <StatBox value={shot.shot_count} label="Toplam Şut" />
              <StatBox value={shot.goal_count} label="Gol" />
              <StatBox value={shot.xg_value} label="xG" />
              <StatBox value={shot.shot_blocked} label="Bloklanan" />
              <StatBox value={shot.off_target} label="İsabetsiz" />
            </div>

            <div className="stats-section">
              <div className="section-header">Pas</div>
              <StatBox value={pass.pass_count} label="Toplam Pas" />
              <StatBox value={pass.complete_pass} label="Başarılı Pas" />
              <StatBox
                value={
                  pass.pass_count > 0
                    ? ((pass.complete_pass / pass.pass_count) * 100).toFixed(1)
                    : 0
                }
                label="Pas Başarı %"
              />
              <StatBox value={pass.shot_assist} label="Şut Asisti" />
              <StatBox value={pass.long_pass} label="Uzun Pas" />
            </div>

            <div className="stats-section">
              <div className="section-header">Dribbling</div>
              <StatBox
                value={dribble.dribble_count}
                label="Dribbling Denemesi"
              />
              <StatBox
                value={dribble.drible_complated}
                label="Başarılı Dribbling"
              />
            </div>

            <div className="stats-section">
              <div className="section-header">Savunma & Duel</div>
              <StatBox
                value={interception.interception_count}
                label="Top Kesme"
              />
              <StatBox value={duel.tackle_count} label="Müdahale" />
              <StatBox value={duel.duel_won} label="Kazanılan Duel" />
              <StatBox value={duel.aerial_won} label="Hava Topu Kazanılan" />
            </div>
          </>
        )}
      </>
    );
  };

  const renderLineupList = (lineup) => {
    if (!lineup?.lineup)
      return (
        <ul className="player-list">
          <li className="empty-list">Değişiklik yok</li>
        </ul>
      );

    const subs = lineup.lineup
      .filter((p) => p.positions[0]?.start_reason !== "Starting XI")
      .map((p) => {
        const pos = p.positions[0];
        const enteredAt = pos?.from ? `${pos.from}'` : "";
        const replaced = pos?.to ? ` → ${pos.to}` : "";

        return (
          <li
            key={p.player_id}
            className={`player-item ${
              activePlayer === p.player_id ? "active" : ""
            }`}
            onClick={() => loadPlayerStats(p.player_id, p.player_name)}
          >
            <div className="player-link">
              <span className="player-number">{p.jersey_number}</span>
              <span className="player-name">
                {p && p.player_nickname != null ? p.player_nickname : p.player_name}
              </span>
              <span className="player-time">
                {enteredAt}
                {replaced}
              </span>
            </div>
          </li>
        );
      });

    if (subs.length === 0) {
      return (
        <ul className="player-list">
          <li className="empty-list">Değişiklik yok</li>
        </ul>
      );
    }

    return <ul className="player-list">{subs}</ul>;
  };

  const getStarting11 = (lineup) =>
    lineup?.lineup?.filter(
      (p) => p.positions?.[0]?.start_reason === "Starting XI"
    ) || [];

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  if (error) return <div className="error-card">Hata: {error}</div>;
  if (!matchData || !lineupData)
    return <div className="error-card">Veri bulunamadı.</div>;

  const homeLineup = lineupData.find(
    (t) => t.team_name === matchData.home_team.home_team_name
  );
  const awayLineup = lineupData.find(
    (t) => t.team_name === matchData.away_team.away_team_name
  );
  const homeFormation = homeLineup?.lineup_name;
  const awayFormation = awayLineup?.lineup_name;

  const homeStarters = getStarting11(homeLineup);
  const homeSubs = renderLineupList(homeLineup);
  const awayStarters = getStarting11(awayLineup);
  const awaySubs = renderLineupList(awayLineup);

  return (
    <>
      <RouterLink to="/" className="back-btn">
        ← Geri Dön
      </RouterLink>

      <div id="matchContent">
        <div className="score-card">
          <div className="score-section">
            <div className="team-info">
              <div className="team-name">
                {matchData.home_team.home_team_name}
              </div>
            </div>
            <div className="score-display">
              <div className="score">
                {matchData.home_score} - {matchData.away_score}
              </div>
            </div>
            <div className="team-info">
              <div className="team-name">
                {matchData.away_team.away_team_name}
              </div>
            </div>
          </div>
        </div>

        <div className="matchContent">
          <div className="main-content">
            <div className="lineup-section">
              <div className="teams-managers">
                <div className="manager-info home">
                  <p className="manager-name">
                    {matchData.home_team.managers[0]?.nickname ||
                      matchData.home_team.managers[0]?.name}
                  </p>
                </div>
                <div className="manager-info away">
                  <p className="manager-name">
                    {matchData.away_team.managers[0]?.nickname ||
                      matchData.away_team.managers[0]?.name}
                  </p>
                </div>
              </div>

              <h5 className="section-title">Başlangıç Dizilişi</h5>

              {/* YENİ: Build-Up Analizi Butonları - İki takım için */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                justifyContent: 'center', 
                marginBottom: '15px' 
              }}>
                <button
                  onClick={() => fetchBuildUpSequences(matchData.home_team.home_team_id)}
                  disabled={loadingSequences}
                  style={{
                    padding: '12px 24px',
                    background: loadingSequences 
                      ? '#95a5a6' 
                      : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: loadingSequences ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)',
                    transition: 'all 0.3s',
                    flex: 1,
                    maxWidth: '250px'
                  }}
                >
                  {loadingSequences ? '⏳' : '🏠'} {matchData.home_team.home_team_name}
                </button>
                
                <button
                  onClick={() => fetchBuildUpSequences(matchData.away_team.away_team_id)}
                  disabled={loadingSequences}
                  style={{
                    padding: '12px 24px',
                    background: loadingSequences 
                      ? '#95a5a6' 
                      : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: loadingSequences ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)',
                    transition: 'all 0.3s',
                    flex: 1,
                    maxWidth: '250px'
                  }}
                >
                  {loadingSequences ? '⏳' : '✈️'} {matchData.away_team.away_team_name}
                </button>
              </div>

              {/* YENİ: Freeze Frame Animation - Pozisyon bazlı veya direkt */}
              {showPassAnimation && buildUpRawData && (
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  {/* Kontrol Seçici */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '15px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => setUsePositionGrouped(true)}
                      style={{
                        padding: '8px 16px',
                        background: usePositionGrouped
                          ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
                          : 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: usePositionGrouped ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      🎯 Pozisyon Bazlı
                    </button>
                    <button
                      onClick={() => setUsePositionGrouped(false)}
                      style={{
                        padding: '8px 16px',
                        background: !usePositionGrouped
                          ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
                          : 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: !usePositionGrouped ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      ⚡ Tüm Passlar
                    </button>
                  </div>

                  {/* Seçilen Kontrolcü */}
                  {usePositionGrouped ? (
                    <PositionGroupedController
                      apiData={buildUpRawData}
                      onFrameUpdate={handleFrameUpdate}
                      onPassDraw={handlePassDraw}
                    />
                  ) : (
                    <DirectFreezeFrameController
                      apiData={buildUpRawData}
                      onFrameUpdate={handleFrameUpdate}
                      onPassDraw={handlePassDraw}
                    />
                  )}
                  
                  <button
                    onClick={closePassAnimation}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(231, 76, 60, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      zIndex: 10
                    }}
                  >
                    ✕ Kapat
                  </button>
                </div>
              )}

              {/* GÜNCELLENDİ: Yeni prop'lar eklendi */}
              <FormationPitch
                homePlayers={homeStarters}
                awayPlayers={awayStarters}
                homeFormation={homeFormation}
                awayFormation={awayFormation}
                onPlayerClick={loadPlayerStats}
                activePlayer={activePlayer}
                animatedPositions={animatedPositions}
                passArrows={passArrows}
              />

              <div className="subs-section">
                <div className="subs-card home">
                  <h5 className="section-title">Ev Sahibi Değişiklikler</h5>
                  {homeSubs}
                </div>
                <div className="subs-card away">
                  <h5 className="section-title">Deplasman Değişiklikler</h5>
                  {awaySubs}
                </div>
              </div>
            </div>

            <div className="match-stats-wrapper">
              <MatchStats
                matchStatsData={matchStatsData}
                homeTeamName={matchData.home_team.home_team_name}
                awayTeamName={matchData.away_team.away_team_name}
              />
            </div>
          </div>

          {showPlayerStats && (
            <div className="stats-sidebar">{renderSidebarContent()}</div>
          )}
        </div>
      </div>
    </>
  );
}

export default MatchDetail;