    // src/utils/freezeFrameTransformer.js
    // Event_360 freeze_frame verisinden pass animasyonu oluşturur

    /**
     * Freeze frame'den oyuncu pozisyonlarını çıkarır ve player ID ile eşleştirir
     * @param {Array} freezeFrame - event_360.freeze_frame array
     * @param {Array} allPlayers - Tüm oyuncular (lineup'tan)
     * @returns {Object} - { playerId: { x, y } } formatında pozisyonlar
     */
    export const extractPlayerPositions = (freezeFrame, allPlayers) => {
      const positions = {};
      
      if (!freezeFrame || !Array.isArray(freezeFrame)) {
        return positions;
      }

      // Her freeze frame pozisyonunu işle


      freezeFrame.forEach((frame, index) => {
        const location = frame.location;
        if (!location || location.length < 2) return;

        // Pozisyonu kaydet
        // Not: freeze_frame'de player bilgisi null olabilir
        // Bu yüzden index veya başka bir yöntemle eşleştirme yapabiliriz
        
        // Geçici olarak index kullan - sonra düzeltiriz
        positions[`player_${index}`] = {
          x: location[0],
          y: location[1],
          teammate: frame.teammate,
          actor: frame.actor,
          keeper: frame.keeper
        };
      });

      return positions;
    };

    /**
     * Pass event'ini işler ve animasyon verisi oluşturur
     * @param {Object} passEvent - Pass event objesi
     * @param {Array} allPlayers - Lineup'tan tüm oyuncular
     * @returns {Object} - Pass frame verisi
     */
    const processPassEvent = (passEvent, allPlayers) => {
      const event = passEvent.events;
      const event360 = passEvent.event_360;

      if (!event || event.type?.name !== "Pass") {
        return null;
      }

      // Pass yapan oyuncu
      const fromPlayerId = event.player?.id;
      const fromPlayerName = event.player?.name;
      
      // Pass konumları
      const fromLocation = event.location || [0, 0];
      const toLocation = event.pass?.end_location || [0, 0];

      // Freeze frame'den tüm oyuncu pozisyonları
      const playerPositions = event360?.freeze_frame || [];

      // Actor'u bul (pass yapan)
      const actorFrame = playerPositions.find(p => p.actor === true);
      
      // Pass alan oyuncuyu tahmin et (toLocation'a en yakın takım arkadaşı)
      let recipientPlayerId = null;
      let minDistance = Infinity;

      playerPositions.forEach((frame, idx) => {
        if (frame.teammate && !frame.actor && frame.location) {
          const dist = Math.sqrt(
            Math.pow(frame.location[0] - toLocation[0], 2) +
            Math.pow(frame.location[1] - toLocation[1], 2)
          );
          
          if (dist < minDistance) {
            minDistance = dist;
            recipientPlayerId = idx; // Geçici ID
          }
        }
      });

      return {
        event_id: event.id,
        timestamp: event.timestamp,
        minute: event.minute,
        second: event.second,
        from_player_id: fromPlayerId,
        from_player_name: fromPlayerName,
        to_player_id: recipientPlayerId,
        from_location: { x: fromLocation[0], y: fromLocation[1] },
        to_location: { x: toLocation[0], y: toLocation[1] },
        pass_length: event.pass?.length || 0,
        pass_type: event.pass?.type?.name || "Regular Pass",
        // Freeze frame'deki TÜM oyuncu pozisyonları
        all_player_positions: playerPositions.map((frame, idx) => ({
          index: idx,
          location: { x: frame.location[0], y: frame.location[1] },
          teammate: frame.teammate,
          actor: frame.actor,
          keeper: frame.keeper
        }))
      };
    };

    /**
     * API'den gelen tüm veriyi işler
     * @param {Object} apiData - API response
     * @returns {Array} - Animasyon için hazır pass sekansları
     */
    export const transformFreezeFrameData = (apiData) => {
      console.log('🎬 Freeze Frame Transform başladı');
      console.log('📊 Gelen veri:', apiData);

      if (!apiData) {
        console.error('❌ API verisi boş');
        return [];
      }

      // Sequences'i bul
      let sequencesArray = apiData.sequences || apiData;
      
      if (!Array.isArray(sequencesArray)) {
        sequencesArray = [sequencesArray];
      }

      console.log(`📦 ${sequencesArray.length} sekans bulundu`);

      const result = [];

      sequencesArray.forEach((sequence, seqIdx) => {
        // Events array'ini bul
        let eventsArray = sequence.events || sequence;
        
        if (!Array.isArray(eventsArray)) {
          eventsArray = [eventsArray];
        }

        console.log(`\n🔄 Sekans ${seqIdx}: ${eventsArray.length} event`);

        const frames = [];

        eventsArray.forEach((eventWrapper, eventIdx) => {
          const event = eventWrapper.events || eventWrapper;
          const event360 = eventWrapper.event_360;

          // Sadece 360 verisi olan Pass event'leri işle
          if (event.type?.name === "Pass" && event360?.freeze_frame) {
            console.log(`  ⚽ Pass ${eventIdx}: ${event.player?.name}`);
            console.log(`    Freeze frame oyuncu sayısı: ${event360.freeze_frame.length}`);

            const frame = processPassEvent(eventWrapper, []);
            
            if (frame) {
              frames.push(frame);
              console.log(`    ✅ Frame eklendi`);
            }
          }
        });

        if (frames.length > 0) {
          result.push({
            sequence_id: seqIdx,
            possession_id: apiData.possession_id || seqIdx,
            frames: frames,
            total_passes: frames.length
          });
          console.log(`✔️ Sekans ${seqIdx}: ${frames.length} pass frame eklendi`);
        }
      });

      console.log(`\n🎉 Transform tamamlandı: ${result.length} sekans hazır`);
      return result;
    };

    /**
     * Frame'deki pozisyonları lineup ile eşleştirir
     * Bu fonksiyon frontend'de çağrılacak çünkü lineup bilgisi orada var
     */
    export const matchPositionsWithLineup = (sequences, homeLineup, awayLineup) => {
      console.log('🔗 Pozisyonları lineup ile eşleştirme başladı');
      
      // Tüm oyuncuları bir map'e koy (hızlı erişim için)
      const allPlayers = [
        ...homeLineup.map(p => ({ ...p, team: 'home' })),
        ...awayLineup.map(p => ({ ...p, team: 'away' }))
      ];

      return sequences.map(sequence => ({
        ...sequence,
        frames: sequence.frames.map(frame => {
          // Frame'deki pozisyonları kullanarak oyuncuları eşleştir
          const mappedPositions = {};
          
          frame.all_player_positions.forEach((pos) => {
            // Basit eşleştirme: pozisyona en yakın oyuncuyu bul
            // Gerçek uygulamada daha sofistike bir eşleştirme yapılabilir
            
            // Şimdilik index kullan - frontend'de daha iyi eşleştirme yapabiliriz
            mappedPositions[`temp_${pos.index}`] = pos.location;
          });

          return {
            ...frame,
            player_positions: mappedPositions
          };
        })
      }));
    };