// DirectFreezeFrameController.jsx - Pozisyon bazlı navigasyon ile
import React, { useState, useEffect, useRef } from 'react';

// Pozisyon Geçiş Popup Komponenti
const TransitionPopup = ({ 
  currentPossessionIndex, 
  totalPossessions, 
  passCount,
  onConfirm, 
  onCancel 
}) => {
  return (
    <div style={popupStyles.overlay}>
      <div style={popupStyles.modal}>
        <div style={popupStyles.icon}>🎯</div>
        <h3 style={popupStyles.title}>Pozisyon Tamamlandı!</h3>
        <p style={popupStyles.message}>
          Pozisyon {currentPossessionIndex + 1} içindeki {passCount} pass tamamlandı.
        </p>
        <p style={popupStyles.question}>
          Sonraki pozisyona ({currentPossessionIndex + 2}/{totalPossessions}) geçmek ister misiniz?
        </p>
        <div style={popupStyles.buttons}>
          <button 
            onClick={onConfirm} 
            style={{...popupStyles.button, ...popupStyles.confirmButton}}
          >
            ✓ Evet, Devam Et
          </button>
          <button 
            onClick={onCancel} 
            style={{...popupStyles.button, ...popupStyles.cancelButton}}
          >
            ✗ Hayır, Burada Kal
          </button>
        </div>
      </div>
    </div>
  );
};

const DirectFreezeFrameController = ({ 
  apiData, // Direkt API'den gelen ham veri (array or single)
  possession = null, // Tek bir possession objesi, varsa yalnızca bu işlenir
  playing = false, // Dışarıdan verilen oynatma durumu
  onFrameUpdate, // Frame güncellemesi
  onPassDraw // Pass oku
}) => {
  // Pozisyon bazlı state'ler
  const [currentPossessionIndex, setCurrentPossessionIndex] = useState(0);
  const [currentPassIndex, setCurrentPassIndex] = useState(0);
  const [showTransitionPopup, setShowTransitionPopup] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Possession'ları ve içindeki pass'leri organize et
  const possessionsData = React.useMemo(() => {
    console.log('🔍 API verisi kontrol ediliyor (Pozisyon bazlı)');
    const input = possession ? [possession] : (Array.isArray(apiData) ? apiData : [apiData]);
    if (!input || input.length === 0) return [];
    
    const result = [];
    
    console.log(`📊 ${input.length} possession bulundu`);

    input.forEach((poss, possIdx) => {
      const sequencesArray = poss.sequences || [];
      const passEvents = [];
      
      console.log(`\n🎯 Possession ${possIdx + 1} (ID: ${poss.possession_id}): ${sequencesArray.length} sekans`);
      
      sequencesArray.forEach((sequence, seqIdx) => {
        const event = sequence.events;
        const event360 = sequence.event_360;
        
        // Pass event mi ve 360 verisi var mı?
        if (event?.type?.name === "Pass") {
          if (event360?.freeze_frame && Array.isArray(event360.freeze_frame) && event360.freeze_frame.length > 0) {
            passEvents.push({
              event: event,
              freeze_frame: event360.freeze_frame,
              visible_area: event360.visible_area,
              sequenceIndex: seqIdx
            });
            console.log(`    ✅ Pass ${seqIdx}: ${event.player?.name} (360 VAR)`);
          } else {
            console.log(`    ❌ Pass ${seqIdx}: ${event.player?.name} (360 YOK)`);
          }
        }
      });
      
      // Sadece 360'lı pass'i olan possession'ları ekle
      if (passEvents.length > 0) {
        result.push({
          possessionId: poss.possession_id,
          possessionIndex: possIdx,
          passes: passEvents
        });
        console.log(`  ✔️ Pozisyon ${possIdx + 1}: ${passEvents.length} pass eklendi`);
      }
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 SONUÇ: ${result.length} pozisyon hazır`);
    result.forEach((p, i) => {
      console.log(`  Pozisyon ${i + 1}: ${p.passes.length} pass`);
    });
    console.log('='.repeat(60));
    
    return result;
  }, [apiData, possession]);

  // Mevcut pozisyon ve pass
  const currentPossession = possessionsData[currentPossessionIndex];
  const currentPass = currentPossession?.passes?.[currentPassIndex];
  const totalPossessions = possessionsData.length;
  const currentPossessionPassCount = currentPossession?.passes?.length || 0;

  // İlk render'da sıfırla
  useEffect(() => {
    if (possessionsData.length > 0) {
      setCurrentPossessionIndex(0);
      setCurrentPassIndex(0);
    }
  }, [possessionsData]);

  // Frame güncelle
  useEffect(() => {
    if (!currentPass) return;

    const event = currentPass.event;
    const freezeFrame = currentPass.freeze_frame;

    console.log(`\n🎬 Pozisyon ${currentPossessionIndex + 1}, Pass ${currentPassIndex + 1}:`, {
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
  }, [currentPossessionIndex, currentPassIndex]);

  const togglePlayPause = () => {
    if (showTransitionPopup) return; // Popup açıkken oynatma
    setIsPlaying(!isPlaying);
  };

  // Sonraki pass'a geç (pozisyon içinde)
  const nextPass = () => {
    if (!currentPossession) return;
    
    if (currentPassIndex < currentPossession.passes.length - 1) {
      // Pozisyon içinde sonraki pass
      setCurrentPassIndex(currentPassIndex + 1);
    } else {
      // Pozisyon sonu - popup göster
      setIsPlaying(false);
      if (currentPossessionIndex < totalPossessions - 1) {
        setShowTransitionPopup(true);
      }
    }
  };

  // Önceki pass'a geç
  const prevPass = () => {
    if (currentPassIndex > 0) {
      setCurrentPassIndex(currentPassIndex - 1);
    } else if (currentPossessionIndex > 0) {
      // Önceki pozisyonun son pass'ına git
      const prevPoss = possessionsData[currentPossessionIndex - 1];
      setCurrentPossessionIndex(currentPossessionIndex - 1);
      setCurrentPassIndex(prevPoss.passes.length - 1);
    }
  };

  // Sonraki pozisyona geç (popup onayı ile)
  const goToNextPossession = () => {
    if (currentPossessionIndex < totalPossessions - 1) {
      setCurrentPossessionIndex(currentPossessionIndex + 1);
      setCurrentPassIndex(0);
      setShowTransitionPopup(false);
    }
  };

  // Popup iptal - mevcut pozisyonda kal
  const cancelTransition = () => {
    setShowTransitionPopup(false);
  };

  // Başa sar (mevcut pozisyon içinde)
  const resetCurrentPossession = () => {
    setCurrentPassIndex(0);
    setIsPlaying(false);
  };

  // Tüm animasyonu başa sar
  const resetAll = () => {
    setCurrentPossessionIndex(0);
    setCurrentPassIndex(0);
    setIsPlaying(false);
    setShowTransitionPopup(false);
  };

  // Eğer parent tarafından oynatma durumu verildiyse senkronize et
  useEffect(() => {
    setIsPlaying(!!playing);
  }, [playing]);

  // Animasyon döngüsü - sadece mevcut pozisyon içinde
  useEffect(() => {
    if (!isPlaying || !currentPass || showTransitionPopup) return;

    const animate = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      const waitTime = 1500 / speed;

      if (deltaTime >= waitTime) {
        // Pozisyon içinde sonraki pass'a geç
        if (currentPassIndex < currentPossession.passes.length - 1) {
          setCurrentPassIndex(prev => prev + 1);
        } else {
          // Pozisyon sonu - durdur ve popup göster
          setIsPlaying(false);
          if (currentPossessionIndex < totalPossessions - 1) {
            setShowTransitionPopup(true);
          }
        }
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
  }, [isPlaying, currentPassIndex, currentPossessionIndex, speed, showTransitionPopup]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!possessionsData || possessionsData.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <p style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>
          360 Freeze Frame Verisi Bulunamadı
        </p>
        <div style={{ 
          fontSize: '14px', 
          opacity: 0.8,
          background: 'rgba(255,255,255,0.05)',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px',
          textAlign: 'left'
        }}>
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
      {/* Transition Popup */}
      {showTransitionPopup && (
        <TransitionPopup
          currentPossessionIndex={currentPossessionIndex}
          totalPossessions={totalPossessions}
          passCount={currentPossessionPassCount}
          onConfirm={goToNextPossession}
          onCancel={cancelTransition}
        />
      )}

      {/* Pozisyon Info Bar */}
      <div style={styles.positionBar}>
        <div style={styles.positionInfo}>
          <span style={styles.positionLabel}>📍 Pozisyon:</span>
          <span style={styles.positionValue}>
            {currentPossessionIndex + 1} / {totalPossessions}
          </span>
        </div>
        <div style={styles.positionInfo}>
          <span style={styles.positionLabel}>⚽ Pass:</span>
          <span style={styles.positionValue}>
            {currentPassIndex + 1} / {currentPossessionPassCount}
          </span>
        </div>
      </div>

      {/* Pass Info Bar */}
      {event && (
        <div style={styles.infoBar}>
          <div style={styles.infoGroup}>
            <span style={styles.infoLabel}>Oyuncu:</span>
            <span style={styles.infoValue}>
              {event.player?.name || 'Bilinmiyor'}
            </span>
          </div>

          <div style={styles.infoGroup}>
            <span style={styles.infoLabel}>Zaman:</span>
            <span style={styles.infoValue}>
              {event.minute}:{String(event.second).padStart(2, '0')}
            </span>
          </div>

          <div style={styles.infoGroup}>
            <span style={styles.infoLabel}>Uzunluk:</span>
            <span style={styles.infoValue}>
              {event.pass?.length?.toFixed(1) || '?'}m
            </span>
          </div>

          <div style={styles.infoGroup}>
            <span style={styles.infoLabel}>Oyuncu Sayısı:</span>
            <span style={styles.infoValue}>
              {currentPass?.freeze_frame?.length || 0}
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <button 
          onClick={prevPass} 
          style={{...styles.button, ...styles.navButton}}
          disabled={currentPossessionIndex === 0 && currentPassIndex === 0}
        >
          ⏮ Önceki
        </button>

        <button 
          onClick={togglePlayPause} 
          style={{...styles.button, ...styles.playButton}}
          disabled={showTransitionPopup}
        >
          {isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
        </button>

        <button 
          onClick={nextPass} 
          style={{...styles.button, ...styles.navButton}}
          disabled={
            currentPossessionIndex === totalPossessions - 1 && 
            currentPassIndex === currentPossessionPassCount - 1
          }
        >
          İleri ⏭
        </button>

        <button 
          onClick={resetCurrentPossession} 
          style={{...styles.button, ...styles.resetButton}}
        >
          🔄 Pozisyon Başı
        </button>

        <button 
          onClick={resetAll} 
          style={{...styles.button, ...styles.resetAllButton}}
        >
          ⏪ En Başa
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

      {/* Progress Bar - Pozisyon içi ilerleme */}
      <div style={styles.progressContainer}>
        <span style={styles.progressLabel}>Pozisyon İlerlemesi:</span>
        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${((currentPassIndex + 1) / currentPossessionPassCount) * 100}%`
            }}
          />
        </div>
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

// Popup stilleri
const popupStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    padding: '30px 40px',
    maxWidth: '450px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(79, 195, 247, 0.3)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '15px',
  },
  title: {
    color: '#4fc3f7',
    fontSize: '22px',
    marginBottom: '15px',
    fontWeight: 'bold',
  },
  message: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
    marginBottom: '10px',
  },
  question: {
    color: 'white',
    fontSize: '16px',
    marginBottom: '25px',
    fontWeight: '500',
  },
  buttons: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  confirmButton: {
    background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(79, 195, 247, 0.4)',
  },
  cancelButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
};

// Ana bileşen stilleri
const styles = {
  container: {
    background: 'rgba(0, 0, 0, 0.85)',
    borderRadius: '12px',
    padding: '20px',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    position: 'relative',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#95a5a6',
    fontSize: '16px',
  },
  positionBar: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '15px',
    padding: '12px',
    background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.2) 0%, rgba(33, 150, 243, 0.2) 100%)',
    borderRadius: '8px',
    border: '1px solid rgba(79, 195, 247, 0.3)',
  },
  positionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  positionLabel: {
    fontSize: '14px',
    opacity: 0.8,
  },
  positionValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4fc3f7',
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
  },
  infoLabel: {
    opacity: 0.7,
    fontSize: '11px',
  },
  infoValue: {
    fontWeight: 'bold',
    color: '#4fc3f7',
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
  },
  navButton: {
    background: 'rgba(255, 255, 255, 0.15)',
  },
  playButton: {
    background: 'linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%)',
    boxShadow: '0 4px 15px rgba(79, 195, 247, 0.4)',
  },
  resetButton: {
    background: 'rgba(231, 76, 60, 0.6)',
  },
  resetAllButton: {
    background: 'rgba(155, 89, 182, 0.6)',
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
    justifyContent: 'center',
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
  progressContainer: {
    marginBottom: '10px',
  },
  progressLabel: {
    fontSize: '12px',
    opacity: 0.7,
    marginBottom: '5px',
    display: 'block',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
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

export default DirectFreezeFrameController;