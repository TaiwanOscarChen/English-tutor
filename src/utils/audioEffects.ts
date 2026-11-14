// Web Audio API Sound Effects Synthesizer for High-Tech Cleanroom Interactive UI

export type AmbientSoundType = 'fan' | 'alarm' | 'silent';

let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let masterCompressorNode: DynamicsCompressorNode | null = null;

// Ambient Loop Management
let ambientNoiseSource: AudioBufferSourceNode | null = null;
let ambientOscHum: OscillatorNode | null = null;
let ambientAlarmTimer: any = null;
let ambientMasterGain: GainNode | null = null;
let currentPlayingAmbientType: AmbientSoundType = 'silent';

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      try {
        // 建立音訊動態壓縮器 (Dynamics Compressor) 與主增益放大總線 (Master Gain Bus)
        // 確保在極致大聲模式下各音效清脆飽滿、穿透力強且完全無破音失真 (Clarity & Anti-Clipping)
        masterCompressorNode = audioCtx.createDynamicsCompressor();
        masterCompressorNode.threshold.setValueAtTime(-14, audioCtx.currentTime);
        masterCompressorNode.knee.setValueAtTime(20, audioCtx.currentTime);
        masterCompressorNode.ratio.setValueAtTime(8, audioCtx.currentTime);
        masterCompressorNode.attack.setValueAtTime(0.003, audioCtx.currentTime);
        masterCompressorNode.release.setValueAtTime(0.2, audioCtx.currentTime);

        masterGainNode = audioCtx.createGain();
        masterGainNode.gain.setValueAtTime(1.45, audioCtx.currentTime); // 145% 響度深度放大

        masterCompressorNode.connect(masterGainNode);
        masterGainNode.connect(audioCtx.destination);
      } catch (e) {
        console.warn("Master audio pipeline init error:", e);
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const getSharedAudioContext = getAudioContext;

function getMasterAudioDestination(ctx: AudioContext): AudioNode {
  if (masterCompressorNode) return masterCompressorNode;
  return ctx.destination;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('fse_sound_enabled') !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fse_sound_enabled', enabled ? 'true' : 'false');
}

export function getAmbientSoundType(): AmbientSoundType {
  if (typeof window === 'undefined') return 'silent';
  const stored = localStorage.getItem('fse_ambient_sound_type');
  if (stored === 'fan' || stored === 'alarm' || stored === 'silent') {
    return stored;
  }
  return 'silent';
}

export function setAmbientSoundType(type: AmbientSoundType): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fse_ambient_sound_type', type);
}

export function getAmbientSoundVolume(): number {
  if (typeof window === 'undefined') return 0.25;
  const stored = localStorage.getItem('fse_ambient_sound_volume');
  if (stored) {
    const parsed = parseFloat(stored);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }
  return 0.25;
}

export function setAmbientSoundVolume(vol: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(1, vol));
  localStorage.setItem('fse_ambient_sound_volume', clamped.toString());
  if (ambientMasterGain && audioCtx) {
    try {
      ambientMasterGain.gain.setValueAtTime(clamped * 0.16, audioCtx.currentTime);
    } catch (e) {}
  }
}

export function playClickSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(getMasterAudioDestination(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
}

export function playWaferSnapSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(460, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.24, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(getMasterAudioDestination(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {}
}

export function playSuccessChime(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const dest = getMasterAudioDestination(ctx);
    
    // First note E5
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc1.connect(gain1);
    gain1.connect(dest);
    osc1.start(now);
    osc1.stop(now + 0.32);

    // Second note B5
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.1);
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc2.connect(gain2);
    gain2.connect(dest);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.48);
  } catch (e) {}
}

export function playLaserScanSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(getMasterAudioDestination(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}

/**
 * 晶圓半導體無塵室專屬過渡確認音效 (Cleanroom Acoustic Transition & Confirmation Cue)
 * 用於句子朗讀結束時的極短柔和聲學音標，自然區隔語句、提升聽覺專注度並防止連續播放時的聽覺疲勞
 */
export function playCleanroomConfirmationCue(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const dest = getMasterAudioDestination(ctx);
    
    // 主音頻：柔和純淨的正弦波 880Hz (A5) 柔順滑落至 587.33Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.075);

    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc1.connect(gain1);
    gain1.connect(dest);

    osc1.start(now);
    osc1.stop(now + 0.075);

    // 晶圓高階和聲微晶泛音 (1760Hz 晶瑩感)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now);
    gain2.gain.setValueAtTime(0.05, now);
    gain2.gain.exponentialRampToValueAtTime(0.0008, now + 0.045);

    osc2.connect(gain2);
    gain2.connect(dest);

    osc2.start(now);
    osc2.stop(now + 0.045);
  } catch (e) {}
}

/**
 * 產生無塵室層流 FFU 風扇白/粉紅濾波連續背景噪音 (Laminar Flow Fan Noise)
 */
function createCleanroomFanAudioBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 3; // 3 秒無縫循環緩衝區
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  
  // 生成溫和粉紅噪聲 (Pink Noise)
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

/**
 * 播放單次機台運轉警示微蜂鳴 (Cleanroom Machine Alert Chime)
 */
export function playMachineryAlertPulse(customVol?: number): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const vol = (customVol !== undefined ? customVol : getAmbientSoundVolume()) * 0.08;
  if (vol <= 0.001) return;

  try {
    const now = ctx.currentTime;
    // 雙音頻晶圓機台警報 (988Hz B5 + 1318.5Hz E6) 兩段節奏蜂鳴
    const playTone = (timeOffset: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const toneGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(988, now + timeOffset);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.5, now + timeOffset);

      toneGain.gain.setValueAtTime(vol, now + timeOffset);
      toneGain.gain.exponentialRampToValueAtTime(0.0005, now + timeOffset + 0.11);

      osc1.connect(toneGain);
      osc2.connect(toneGain);
      toneGain.connect(getMasterAudioDestination(ctx));

      osc1.start(now + timeOffset);
      osc2.start(now + timeOffset);
      osc1.stop(now + timeOffset + 0.11);
      osc2.stop(now + timeOffset + 0.11);
    };

    playTone(0);
    playTone(0.14);
  } catch (e) {}
}

/**
 * 啟動持續背景環境音 (Continuous Cleanroom Ambient Loop)
 */
export function startContinuousAmbient(type?: AmbientSoundType): void {
  const chosenType = type || getAmbientSoundType();
  if (!isSoundEnabled() || chosenType === 'silent') {
    stopContinuousAmbient();
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  stopContinuousAmbient();
  currentPlayingAmbientType = chosenType;

  const vol = getAmbientSoundVolume();
  ambientMasterGain = ctx.createGain();
  ambientMasterGain.gain.setValueAtTime(vol * 0.16, ctx.currentTime);
  ambientMasterGain.connect(getMasterAudioDestination(ctx));

  if (chosenType === 'fan') {
    try {
      const buffer = createCleanroomFanAudioBuffer(ctx);
      ambientNoiseSource = ctx.createBufferSource();
      ambientNoiseSource.buffer = buffer;
      ambientNoiseSource.loop = true;

      // 低通濾波器模擬無塵室層流回風罩 (300Hz 溫和低沉風切白噪音)
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(320, ctx.currentTime);
      lowpass.Q.setValueAtTime(1.0, ctx.currentTime);

      ambientNoiseSource.connect(lowpass);
      lowpass.connect(ambientMasterGain);
      ambientNoiseSource.start();

      // 低頻 55Hz 微震動子聲 (模擬無塵室廠務風機管線共振)
      ambientOscHum = ctx.createOscillator();
      const humGain = ctx.createGain();
      ambientOscHum.type = 'sine';
      ambientOscHum.frequency.setValueAtTime(55, ctx.currentTime);
      humGain.gain.setValueAtTime(0.02, ctx.currentTime);

      ambientOscHum.connect(humGain);
      humGain.connect(ambientMasterGain);
      ambientOscHum.start();
    } catch (e) {}
  } else if (chosenType === 'alarm') {
    // 週期性機台警報模式：每 3.8 秒發出一次柔和警報提示
    playMachineryAlertPulse();
    ambientAlarmTimer = setInterval(() => {
      playMachineryAlertPulse();
    }, 3800);
  }
}

/**
 * 停止持續背景環境音
 */
export function stopContinuousAmbient(): void {
  if (ambientAlarmTimer) {
    clearInterval(ambientAlarmTimer);
    ambientAlarmTimer = null;
  }
  if (ambientNoiseSource) {
    try {
      ambientNoiseSource.stop();
      ambientNoiseSource.disconnect();
    } catch (e) {}
    ambientNoiseSource = null;
  }
  if (ambientOscHum) {
    try {
      ambientOscHum.stop();
      ambientOscHum.disconnect();
    } catch (e) {}
    ambientOscHum = null;
  }
  if (ambientMasterGain) {
    try {
      ambientMasterGain.disconnect();
    } catch (e) {}
    ambientMasterGain = null;
  }
  currentPlayingAmbientType = 'silent';
}

/**
 * 取得當前持續播放中的背景環境音類型
 */
export function getCurrentPlayingAmbientType(): AmbientSoundType {
  return currentPlayingAmbientType;
}

/**
 * 語句與語句之間混音疊加環境音效 (Inter-sentence Ambient Transition Cue)
 */
export function playAmbientInterSentenceCue(type?: AmbientSoundType): void {
  const chosenType = type || getAmbientSoundType();
  if (!isSoundEnabled() || chosenType === 'silent') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const vol = getAmbientSoundVolume();

  if (chosenType === 'fan') {
    // 短暫柔和風切流動聲
    try {
      const buffer = createCleanroomFanAudioBuffer(ctx);
      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(360, ctx.currentTime);

      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol * 0.08, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.32);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(getMasterAudioDestination(ctx));

      src.start(now);
      src.stop(now + 0.35);
    } catch (e) {}
  } else if (chosenType === 'alarm') {
    // 疊加機台警報提示音
    playMachineryAlertPulse(vol);
  }
}

/**
 * 短暫試聽背景環境音 (Preview Ambient Sound with customizable duration)
 */
export function previewAmbientSound(type: AmbientSoundType, durationMs: number = 2600, onEnd?: () => void): () => void {
  if (type === 'silent') {
    stopContinuousAmbient();
    if (onEnd) onEnd();
    return () => {};
  }

  startContinuousAmbient(type);
  const timer = setTimeout(() => {
    stopContinuousAmbient();
    if (onEnd) onEnd();
  }, durationMs);

  return () => {
    clearTimeout(timer);
    stopContinuousAmbient();
  };
}

/**
 * 晶圓無塵室廣播與重大警報廣播提示音 (Cleanroom PA Intercom Broadcast Chime)
 * 4段溫和優雅穿透性叮咚和弦 (C5 -> E5 -> G5 -> C6)
 */
export function playCleanroomAlarmChime(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(getMasterAudioDestination(ctx));

      osc.start(startTime);
      osc.stop(startTime + 0.46);
    });
  } catch (e) {}
}

/**
 * SVO 積木卡榫吸附成功機械卡扣音效 (Robotic Mechanical Lock Chime)
 */
export function playSvoAssembleChime(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(getMasterAudioDestination(ctx));

    osc.start(now);
    osc.stop(now + 0.16);
  } catch (e) {}
}

