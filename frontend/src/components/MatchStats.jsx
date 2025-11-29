import React, {  useState } from 'react';
import '../css/matchStats.css';


const StatBar = ({ homeValue, awayValue, label }) => {
    const numHome = Number(homeValue) || 0;
    const numAway = Number(awayValue) || 0;
    const total = numHome + numAway;
    const homePercentage = total > 0 ? (numHome / total) * 100 : 50;
    const awayPercentage = total > 0 ? (numAway / total) * 100 : 50;

    return (
        <div className="stat-bar-container">
            <div className="stat-bar-header">
                <span className="stat-value-left">{numHome}</span>
                <span className="stat-label">{label}</span>
                <span className="stat-value-right">{numAway}</span>
            </div>
            <div className="progress-bar">
                <div 
                    className="progress-bar-home" 
                    style={{ width: `${homePercentage}%` }}
                ></div>
                <div 
                    className="progress-bar-away" 
                    style={{ width: `${awayPercentage}%` }}
                ></div>
            </div>
        </div>
    );
};

const PeriodStats = ({ period, periodName }) => {
    
    if (!period || !period.home_team || !period.away_team) {
        console.log('Period data missing:', periodName, period);
        return (
            <div className="period-section">
                <h4 className="period-title">{periodName} için veri yok.</h4>
            </div>
        );
    }

    const home = period.home_team ;
    const away = period.away_team;

    return (
        <div className="period-section">
 
            
            <h4 className="period-title">{periodName}</h4>
            
            <div className="stats-group">
                <h5 className="group-title">Hücum</h5>
                <StatBar homeValue={home.shot_count} awayValue={away.shot_count} label="Toplam Şut" />
                <StatBar homeValue={home.shot_target} awayValue={away.shot_target} label="İsabetli Şut" />
                <StatBar homeValue={home.total_xg ? home.total_xg.toFixed(2) : 0} awayValue={away.total_xg ? away.total_xg.toFixed(2) : 0} label="xG" />
            </div>

            <div className="stats-group">
                <h5 className="group-title">Pas & Top</h5>
                <StatBar 
                    homeValue={home.pass_comp} 
                    awayValue={away.pass_comp} 
                    label="Başarılı Pas" 
                />
                <StatBar 
                    homeValue={home.pass_count > 0 ? Math.round((home.pass_comp / home.pass_count) * 100) : 0} 
                    awayValue={away.pass_count > 0 ? Math.round((away.pass_comp / away.pass_count) * 100) : 0} 
                    label="Pas İsabeti (%)" 
                />
                <StatBar homeValue={home.carry_count} awayValue={away.carry_count} label="Top Taşıma" />
            </div>

            <div className="stats-group">
                <h5 className="group-title">Dribling</h5>
                <StatBar homeValue={home.dribble_comp} awayValue={away.dribble_comp} label="Başarılı Dribling" />
                <StatBar homeValue={home.duel_won} awayValue={away.duel_won} label="İkili Mücadele" />
                <StatBar homeValue={home.interception_comp} awayValue={away.interception_comp} label="Pas Arası" />
            </div>

            <div className="stats-group">
                <h5 className="group-title">Faul</h5>
                <StatBar homeValue={home.faul_won} awayValue={away.faul_won} label="Kazanılan" />
                <StatBar homeValue={home.faul_commited} awayValue={away.faul_commited} label="Yapılan" />
            </div>

            <div className="stats-group">
                <h5 className="group-title">Kaleci</h5>
                <StatBar homeValue={home.saved_shot} awayValue={away.saved_shot} label="Kurtarış" />
            </div>
        </div>
    );
};



function MatchStats({ matchStatsData, homeTeamName, awayTeamName }) {
    

    const [periodSelect, setPeriodSelect] = useState(1); 
    


    if (!matchStatsData) {
        return (
            <div className="match-stats-container">
                <div className="match-stats-header">
                    <div className="vs-divider">İSTATİSTİKLER</div>
                </div>
                <p style={{ textAlign: 'center', color: '#95a5a6', padding: '2rem' }}>
                    Maç istatistikleri yükleniyor...
                </p>
            </div>
        );
    }

    const firstPeriod = matchStatsData.first_period;
    const lastPeriod = matchStatsData.last_period;
    const allPeriods = matchStatsData.firstPeriod+matchStatsData.lastPeriod;

    return (
        <div className="match-stats-container">
            <div className="match-stats-header">
                <div className="team-header home-team">{homeTeamName}</div>
                <div className="vs-divider">İSTATİSTİKLER</div>
                <div className="team-header away-team">{awayTeamName}</div>
            </div>

           
            <div className='periodSelector'>
                   <button
                    className={periodSelect === 3 ? 'active' : ''} 
                    onClick={() => setPeriodSelect(3)}
                >Tüm</button>
                <button 
                    className={periodSelect === 1 ? 'active' : ''} 
                    onClick={() => setPeriodSelect(1)}
                >1</button>
                <button 
                    className={periodSelect === 2 ? 'active' : ''} 
                    onClick={() => setPeriodSelect(2)}
                >2</button>
             
                
            </div>

            <div className="periods-container">
               
                {periodSelect === 1 && <PeriodStats period={firstPeriod} periodName="İlk Yarı" />}
                {periodSelect === 2 && <PeriodStats period={lastPeriod} periodName="İkinci Yarı" />}
                {periodSelect === 3 && <PeriodStats period={allPeriods} periodName="Tüm" />}


            </div>
        </div>
    );
}

export default MatchStats;