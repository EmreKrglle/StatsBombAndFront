// PositionGroupedController.jsx - Pozisyon bazlı gruplandırılmış buildup sekansları
import React, { useState, useEffect, useRef } from 'react';

const PositionGroupedController = ({ 
  apiData, // Direkt API'den gelen ham veri
  possession = null,
  onFrameUpdate, // Frame güncellemesi
  onPassDraw // Pass oku
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);
  const [currentPassInZone, setCurrentPassInZone] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Pozisyon bölgelerini tanımla (StatsBomb koordinat sistemi: 120x80)
  const getPositionZone = (x) => {
    if (x < 40) return 'defensive'; // Savunma üçüncüsü
    if (x < 80) return 'middle';    // Orta saha üçüncüsü
    return 'attacking';              // Hücum üçüncüsü
  };

  const getZoneName = (zone) => {
    const names = {
      'defensive': 'Savunma Bölgesi',
      'middle': 'Orta Saha Bölgesi',
      'attacking': 'Hücum Bölgesi'
    };
    return names[zone] || zone;
  };

  // Pass event'lerini filtrele ve pozisyona göre grupla
  const groupedPasses = React.useMemo(() => {
    console.log('🔍 Pozisyon bazlı gruplama başlıyor');
    const input = possession ? [possession] : (Array.isArray(apiData) ? apiData : [apiData]);
    if (!input || input.length === 0) return [];
    
    const allPasses = [];
    
    input.forEach((possession, possIdx) => {
      const sequencesArray = possession.sequences || [];
      
      console.log(`\n🎯 Possession ${possIdx + 1} (ID: ${possession.possession_id}): ${sequencesArray.length} sekans`);
      
      sequencesArray.forEach((sequence, seqIdx) => {
        const event = sequence.events;
        const event360 = sequence.event_360;
        
        if (event?.type?.name === "Pass" && event360?.freeze_frame && Array.isArray(event360.freeze_frame) && event360.freeze_frame.length > 0) {
          // Pass'in başlangıç pozisyonuna göre bölge belirle
          const zone = getPositionZone(event.location[0]);
          
          allPasses.push({
            event: event,
            freeze_frame: event360.freeze_frame,
            visible_area: event360.visible_area,
            possessionId: possession.possession_id,
            sequenceIndex: seqIdx,
            zone: zone
          });
          
          console.log(`  ✓ Pass: ${event.player?.name} - Bölge: ${getZoneName(zone)}`);
        }
      });
    });
    
    // Pozisyona göre grupla
    const grouped = [];
    let currentGroup = null;
    
    allPasses.forEach(pass => {
      if (!currentGroup || currentGroup.zone !== pass.zone) {
        // Yeni bölgeye geçiş
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        currentGroup = {
          zone: pass.zone,
          passes: [pass]
        };
      } else {
        // Aynı bölgede devam
        currentGroup.passes.push(pass);
      }
    });
    
    // Son grubu ekle
    if (currentGroup) {
      grouped.push(currentGroup);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 GRUPLAMA SONUCU:`);
    console.log(`  - Toplam Pass: ${allPasses.length}`);
    console.log(`  - Toplam Bölge Grubu: ${grouped.length}`);
    grouped.forEach((group, idx) => {
      console.log(`  - ${idx + 1}. ${getZoneName(group.zone)}: ${group.passes.length} pass`);
    });
    console.log('='.repeat(60));
    
    return grouped;
  }, [apiData, possession]);

  // İlk render'da index'leri sıfırla
  useEffect(() => {
    if (groupedPasses.length > 0) {
      setCurrentZoneIndex(0);
      setCurrentPassInZone(0);
      setWaitingForConfirmation(false);
    }
  }, [groupedPasses]);

  // Mevcut bölge ve pass
  const currentZone = groupedPasses[currentZoneIndex];
  const currentPass = currentZone?.passes?.[currentPassInZone];

  // Frame güncelle
  useEffect(() => {
    if (!currentPass) return;

    const event = currentPass.event;
    const freezeFrame = currentPass.freeze_frame;

    console.log(`\n🎬 Frame - Bölge ${currentZoneIndex + 1}/${groupedPasses.length}, Pass ${currentPassInZone + 1}/${currentZone?.passes.length}:`, {
      zone: getZoneName(currentZone.zone),
      player: event.player?.name,
      from: event.location,
      to: event.pass?.end_location,
      players: freezeFrame.length
    });

    // TÜM oyuncu pozisyonlarını güncelle
    const positions = {};
    
    freezeFrame.forEach((player, idx) => {
      if (player.location && player.location.length >= 2) {
        positions[`freeze_${idx}`] = {
          x: player.location[0],
          y: player.location[1],
          teammate: player.teammate,
          actor: player.actor,
          keeper: player.keeper
        };
      }
    });

    console.log(`📍 ${Object.keys(positions).length} oyuncu pozisyonu güncellendi`);
    onFrameUpdate(positions);

    // Pass okunu çiz
    if (event.location && event.pass?.end_location) {
      onPassDraw({
        from: {
          x: event.location[0],
          y: event.location[1]
        },
        to: {
          x: event.pass.end_location[0],
          y: event.pass.end_location[1]
        }
      });
    }
  }, [currentZoneIndex, currentPassInZone]);

  const togglePlayPause = () => {
    if (waitingForConfirmation) return; // Onay beklerken oynatma
    setIsPlaying(!isPlaying);
  };

  const nextFrame = () => {
    if (!currentZone) return;

    // Bölge içinde bir sonraki pass'a geç
    if (currentPassInZone < currentZone.passes.length - 1) {
      setCurrentPassInZone(currentPassInZone + 1);
    } else {
      // Bölge bitti, bir sonraki bölgeye geçmek için onay bekle
      if (currentZoneIndex < groupedPasses.length - 1) {
        setIsPlaying(false); // Oynatmayı durdur
        setWaitingForConfirmation(true); // Onay bekle
      } else {
        // Son bölge de bitti, başa dön
        setCurrentZoneIndex(0);
        setCurrentPassInZone(0);
        setIsPlaying(false);
      }
    }
  };

  const confirmNextZone = () => {
    // Kullanıcı onayladı, bir sonraki bölgeye geç
    setCurrentZoneIndex(currentZoneIndex + 1);
    setCurrentPassInZone(0);
    setWaitingForConfirmation(false);
    setIsPlaying(true); // Otomatik olarak oynatmaya devam et
  };

  const prevFrame = () => {
    if (waitingForConfirmation) {
      // Onay beklerken geri giderse, onayı iptal et ve önceki pass'a dön
      setWaitingForConfirmation(false);
    }

    if (currentPassInZone > 0) {
      setCurrentPassInZone(currentPassInZone - 1);
    } else if (currentZoneIndex > 0) {
      // Önceki bölgeye geç
      setCurrentZoneIndex(currentZoneIndex - 1);
      const prevZone = groupedPasses[currentZoneIndex - 1];
      setCurrentPassInZone(prevZone.passes.length - 1);
    }
  };

  const reset = () => {
    setCurrentZoneIndex(0);
    setCurrentPassInZone(0);
    setIsPlaying(false);
    setWaitingForConfirmation(false);
  };

  // Animasyon döngüsü
  useEffect(() => {
    if (!isPlaying || !currentPass || waitingForConfirmation) return;

    const animate = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      const waitTime = 1500 / speed;

      if (deltaTime >= waitTime) {
        nextFrame();
        lastTimeRef.current = timestamp;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentPass, speed, waitingForConfirmation]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!groupedPasses || groupedPasses.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <p style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>
          360 Freeze Frame Verisi Bulunamadı
        </p>
        <div style={styles.emptyStateInfo}>
          <p style={{ marginBottom: '10px' }}>Bu durum şu sebeplerle olabilir:</p>
          <ul style={{ marginLeft: '20px', marginTop: '10px', marginBottom: '15px' }}>
            <li>Tüm pass event'lerinde event_360 verisi yok</li>
            <li>freeze_frame array'leri boş</li>
            <li>Bu maçta 360 tracking yapılmamış</li>
          </ul>
        </div>
      </div>
    );
  }

  const event = currentPass?.event;

  return (
    <div style={styles.container}>
      {/* Bölge Bilgisi */}
      <div style={styles.zoneHeader}>
        <div style={styles.zoneBadge}>
          <span style={styles.zoneIcon}>
            {currentZone?.zone === 'defensive' && '🛡️'}
            {currentZone?.zone === 'middle' && '⚡'}
            {currentZone?.zone === 'attacking' && '⚔️'}
          </span>
          <span style={styles.zoneName}>{getZoneName(currentZone?.zone)}</span>
        </div>
        <div style={styles.zoneProgress}>
          Bölge {currentZoneIndex + 1} / {groupedPasses.length}
        </div>
      </div>

      {/* Onay Bekleme Ekranı */}
      {waitingForConfirmation && (
        <div style={styles.confirmationOverlay}>
          <div style={styles.confirmationBox}>
            <div style={styles.confirmationIcon}>🎯</div>
            <h3 style={styles.confirmationTitle}>Bir Sonraki Bölgeye Geç</h3>
            <p style={styles.confirmationText}>
              <strong>{getZoneName(currentZone?.zone)}</strong> bölgesi tamamlandı.
            </p>
            <p style={styles.confirmationText}>
              Devam etmek için <strong>{getZoneName(groupedPasses[currentZoneIndex + 1]?.zone)}</strong> bölgesine geçin.
            </p>
            <button
              onClick={confirmNextZone}
              style={styles.confirmButton}
            >
              ✓ Devam Et
            </button>
          </div>
        </div>
      )}

      {/* Info Bar */}
      <div style={styles.infoBar}>
        <div style={styles.infoGroup}>
          <span style={styles.infoLabel}>Bölge İçi Pass:</span>
          <span style={styles.infoValue}>
            {currentPassInZone + 1} / {currentZone?.passes?.length || 0}
          </span>
        </div>
        
        <div style={styles.infoGroup}>
          <span style={styles.infoLabel}>Oyuncu:</span>
          <span style={styles.infoValue}>
            {event?.player?.name || 'Bilinmiyor'}
          </span>
        </div>

        <div style={styles.infoGroup}>
          <span style={styles.infoLabel}>Zaman:</span>
          <span style={styles.infoValue}>
            {event?.minute}:{String(event?.second).padStart(2, '0')}
          </span>
        </div>

        <div style={styles.infoGroup}>
          <span style={styles.infoLabel}>Uzunluk:</span>
          <span style={styles.infoValue}>
            {event?.pass?.length?.toFixed(1) || '?'}m
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button 
          onClick={prevFrame} 
          style={{...styles.button, ...styles.navButton}}
          disabled={currentZoneIndex === 0 && currentPassInZone === 0}
        >
          ⏮ Önceki
        </button>

        <button 
          onClick={togglePlayPause} 
          style={{
            ...styles.button, 
            ...styles.playButton,
            ...(waitingForConfirmation ? styles.disabledButton : {})
          }}
          disabled={waitingForConfirmation}
        >
          {isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
        </button>

        <button 
          onClick={nextFrame} 
          style={{...styles.button, ...styles.navButton}}
          disabled={
            waitingForConfirmation ||
            (currentZoneIndex === groupedPasses.length - 1 && 
             currentPassInZone === currentZone?.passes?.length - 1)
          }
        >
          İleri ⏭
        </button>

        <button 
          onClick={reset} 
          style={{...styles.button, ...styles.resetButton}}
        >
          🔄 Başa Sar
        </button>
      </div>

      {/* Speed Control */}
      <div style={styles.speedControl}>
        <span style={styles.speedLabel}>Hız:</span>
        {[0.5, 1, 1.5, 2].map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              ...styles.speedButton,
              ...(speed === s ? styles.speedButtonActive : {})
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Progress Bar - Bölge içi */}
      <div style={styles.progressBar}>
        <div 
          style={{
            ...styles.progressFill,
            width: `${((currentPassInZone + 1) / (currentZone?.passes?.length || 1)) * 100}%`
          }}
        />
      </div>

      {/* Pass Type */}
      {event?.pass?.type?.name && (
        <div style={styles.passType}>
          📏 {event.pass.type.name}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    background: 'rgba(0, 0, 0, 0.85)',
    borderRadius: '12px',
    padding: '20px',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    maxHeight: '90vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    position: 'relative',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#95a5a6',
    fontSize: '16px',
  },
  emptyStateInfo: {
    fontSize: '14px', 
    opacity: 0.8,
    background: 'rgba(255,255,255,0.05)',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px',
    textAlign: 'left'
  },
  zoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '15px',
    background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.2) 0%, rgba(33, 150, 243, 0.2) 100%)',
    borderRadius: '8px',
    border: '2px solid rgba(79, 195, 247, 0.3)',
  },
  zoneBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  zoneIcon: {
    fontSize: '24px',
  },
  zoneName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4fc3f7',
  },
  zoneProgress: {
    fontSize: '14px',
    opacity: 0.8,
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '5px 12px',
    borderRadius: '6px',
  },
  confirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    borderRadius: '12px',
  },
  confirmationBox: {
    background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.2) 0%, rgba(39, 174, 96, 0.2) 100%)',
    border: '2px solid #2ecc71',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(46, 204, 113, 0.3)',
  },
  confirmationIcon: {
    fontSize: '48px',
    marginBottom: '15px',
  },
  confirmationTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#2ecc71',
  },
  confirmationText: {
    fontSize: '14px',
    marginBottom: '10px',
    lineHeight: '1.6',
  },
  confirmButton: {
    marginTop: '20px',
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)',
    transition: 'all 0.3s',
  },
  infoBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '15px',
    fontSize: '13px',
  },
  infoGroup: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '8px 12px',
    borderRadius: '6px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    minWidth: '0',
    flex: '1 1 auto',
  },
  infoLabel: {
    opacity: 0.7,
    fontSize: '11px',
    whiteSpace: 'nowrap',
  },
  infoValue: {
    fontWeight: 'bold',
    color: '#4fc3f7',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
    fontWeight: '600',
    flex: '1 1 auto',
    minWidth: '100px',
    maxWidth: '150px',
  },
  navButton: {
    background: 'rgba(255, 255, 255, 0.15)',
  },
  playButton: {
    background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
    boxShadow: '0 4px 15px rgba(79, 195, 247, 0.4)',
  },
  resetButton: {
    background: 'rgba(231, 76, 60, 0.8)',
  },
  disabledButton: {
    background: '#95a5a6',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  speedLabel: {
    fontSize: '14px',
    opacity: 0.8,
  },
  speedButton: {
    padding: '6px 14px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    background: 'transparent',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.3s',
  },
  speedButtonActive: {
    background: '#4fc3f7',
    borderColor: '#4fc3f7',
    fontWeight: 'bold',
    boxShadow: '0 2px 8px rgba(79, 195, 247, 0.5)',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4fc3f7, #2196f3)',
    transition: 'width 0.3s ease',
  },
  passType: {
    textAlign: 'center',
    fontSize: '13px',
    padding: '8px',
    background: 'rgba(79, 195, 247, 0.15)',
    borderRadius: '6px',
    border: '1px solid rgba(79, 195, 247, 0.3)',
  },
};

export default PositionGroupedController;