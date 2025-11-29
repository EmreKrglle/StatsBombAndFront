// DirectFreezeFrameController.jsx - Transform olmadan direkt kullanım
import React, { useState, useEffect, useRef } from 'react';

const DirectFreezeFrameController = ({ 
  apiData, // Direkt API'den gelen ham veri (array or single)
  possession = null, // Tek bir possession objesi, varsa yalnızca bu işlenir
  playing = false, // Dışarıdan verilen oynatma durumu
  onFrameUpdate, // Frame güncellemesi
  onPassDraw // Pass oku
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Pass event'lerini filtrele (360 verisi olanlar)
  const passEvents = React.useMemo(() => {
    console.log('🔍 API verisi kontrol ediliyor');
    const input = possession ? [possession] : (Array.isArray(apiData) ? apiData : [apiData]);
    if (!input || input.length === 0) return [];
    
    const events = [];
    let totalPassEvents = 0;
    let passWithout360 = 0;
    
    // API YAPISI: Array of possessions
    // [{ possession_id: X, sequences: [...] }, ...]
    
    let possessions = input;
    
    console.log(`📊 ${possessions.length} possession bulundu`);

    possessions.forEach((possession, possIdx) => {
      const sequencesArray = possession.sequences || [];
      
      console.log(`\n🎯 Possession ${possIdx + 1} (ID: ${possession.possession_id}): ${sequencesArray.length} sekans`);
      
      sequencesArray.forEach((sequence, seqIdx) => {
        // Her sequence'de:
        // - id: 0
        // - events: { ... tek event objesi ... }
        // - event_360: { freeze_frame: [...] } veya null
        
        const event = sequence.events;
        const event360 = sequence.event_360;
        
        console.log(`  Sekans ${seqIdx}:`, {
          eventType: event?.type?.name,
          playerName: event?.player?.name,
          has360: !!event360,
          hasFreezeFrame: !!event360?.freeze_frame
        });
        
        // Pass event mi?
        if (event?.type?.name === "Pass") {
          totalPassEvents++;
          console.log(`    ✓ Pass: ${event.player?.name}`);
          
          // 360 verisi var mı?
          if (event360?.freeze_frame && Array.isArray(event360.freeze_frame) && event360.freeze_frame.length > 0) {
            events.push({
              event: event,
              freeze_frame: event360.freeze_frame,
              visible_area: event360.visible_area,
              possessionId: possession.possession_id,
              sequenceIndex: seqIdx
            });
            console.log(`      ✅ 360 VAR! (${event360.freeze_frame.length} oyuncu)`);
          } else {
            passWithout360++;
            console.log(`      ❌ 360 YOK (event_360 ${event360 ? 'null' : 'yok'})`);
          }
        }
      });
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 SONUÇ:`);
    console.log(`  - Toplam Pass: ${totalPassEvents}`);
    console.log(`  - 360 verisi olan: ${events.length}`);
    console.log(`  - 360 verisi olmayan: ${passWithout360}`);
    
    if (events.length > 0) {
      console.log(`  ✅ İlk 360'lı pass: ${events[0].event.player?.name}`);
    } else {
      console.log(`  ❌ HİÇ 360'LI PASS YOK!`);
    }
    console.log('='.repeat(60));
    
    return events;
  }, [apiData, possession]);

  // İlk render'da index'i 0'a sıfırla (ilk 360'lı pass)
  useEffect(() => {
    if (passEvents.length > 0) {
      setCurrentEventIndex(0);
    }
  }, [passEvents]);

  // Mevcut event
  const currentPassEvent = passEvents[currentEventIndex];

  // Frame güncelle
  useEffect(() => {
    if (!currentPassEvent) return;

    const event = currentPassEvent.event;
    const freezeFrame = currentPassEvent.freeze_frame;

    console.log(`\n🎬 Frame ${currentEventIndex}:`, {
      player: event.player?.name,
      from: event.location,
      to: event.pass?.end_location,
      players: freezeFrame.length
    });

    // TÜM oyuncu pozisyonlarını güncelle
    const positions = {};
    
    freezeFrame.forEach((player, idx) => {
      if (player.location && player.location.length >= 2) {
        // FREEZE_FRAME ID'si kullan - FormationPitch'te eşleşecek
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
  }, [currentEventIndex]); // SADECE currentEventIndex değişince çalışsın

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const nextFrame = () => {
    if (currentEventIndex < passEvents.length - 1) {
      setCurrentEventIndex(currentEventIndex + 1);
    } else {
      setCurrentEventIndex(0); // Loop
    }
  };

  const prevFrame = () => {
    if (currentEventIndex > 0) {
      setCurrentEventIndex(currentEventIndex - 1);
    }
  };

  const reset = () => {
    setCurrentEventIndex(0);
    setIsPlaying(false);
  };

  // Eğer parent tarafından oynatma durumu verildiyse senkronize et
  useEffect(() => {
    setIsPlaying(!!playing);
  }, [playing]);

  // Animasyon döngüsü
  useEffect(() => {
    if (!isPlaying || !currentPassEvent) return;

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
  }, [isPlaying, currentPassEvent, speed]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!passEvents || passEvents.length === 0) {
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
          <div style={{ 
            marginTop: '15px', 
            padding: '10px',
            background: 'rgba(79, 195, 247, 0.1)',
            borderRadius: '6px',
            borderLeft: '3px solid #4fc3f7'
          }}>
            <strong style={{ color: '#4fc3f7' }}>💡 İpucu:</strong>
            <p style={{ marginTop: '5px', fontSize: '13px' }}>
              Console'da hangi pass'lerde 360 verisi olduğunu kontrol edin.
              Bazı pass'lerde 360 yoksa otomatik atlanır.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const event = currentPassEvent.event;

  return (
    <div style={styles.container}>
      {/* Info Bar */}
      <div style={styles.infoBar}>
        <div style={styles.infoGroup}>
          <span style={styles.infoLabel}>Pass:</span>
          <span style={styles.infoValue}>
            {currentEventIndex + 1} / {passEvents.length}
          </span>
        </div>
        
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
            {currentPassEvent.freeze_frame.length}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button 
          onClick={prevFrame} 
          style={{...styles.button, ...styles.navButton}}
          disabled={currentEventIndex === 0}
        >
          ⏮ Önceki
        </button>

        <button 
          onClick={togglePlayPause} 
          style={{...styles.button, ...styles.playButton}}
        >
          {isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
        </button>

        <button 
          onClick={nextFrame} 
          style={{...styles.button, ...styles.navButton}}
          disabled={currentEventIndex === passEvents.length - 1}
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

      {/* Progress Bar */}
      <div style={styles.progressBar}>
        <div 
          style={{
            ...styles.progressFill,
            width: `${((currentEventIndex + 1) / passEvents.length) * 100}%`
          }}
        />
      </div>

      {/* Pass Type */}
      {event.pass?.type?.name && (
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
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#95a5a6',
    fontSize: '16px',
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
    background: 'rgba(231, 76, 60, 0.8)',
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

export default DirectFreezeFrameController;