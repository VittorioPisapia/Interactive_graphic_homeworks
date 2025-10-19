export let audioContext = null;
export let currentBufferSource = null;
export let currentMediaStream = null;
export let currentMediaStreamSource = null;
export let analyser = null;
export let audioData = null;

export const audioVars = {
    baseLevel: 0.05,
    bassLevel: 0.05,
    attack: 0.12,
    release: 0.01,
    threshold: 0.1,
    minFreq: 10,
    maxFreq: 200
};

export function ensureAudioContext() {

    // Create or resume Audiocontext (mixer)

    if (!audioContext) // if audiocontext = null -> create audiocontext, 48 kHz sample rate
        audioContext = new AudioContext();
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(e => console.warn("AudioContext resume failed:", e));
    }
}

export function createOrResetAnalyser() {

    // Create AnalyserNode for FFT

    if (!audioContext) 
        return;
    if (analyser) {
        try { analyser.disconnect(); } catch(e) {} // ignore the error
    }
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024; // how many samples for fft -> 512 bins
    audioData = new Uint8Array(analyser.frequencyBinCount); // array of integers from 0 to 255, its length is fftsize/2 = bincount. audioData[0] = 0 -> first (bin) frquencies are absent
}

export function stopCurrentAudio() {

    // Stops audio if played (sourcer or stream)

    if (currentBufferSource) {
        try { currentBufferSource.stop(0); } catch(e) {} // stop the audio, ignore the error
        try { currentBufferSource.disconnect(); } catch(e) {} // disconnect, avoids memory consumption (stacca cavo virtuale)
        currentBufferSource = null; // reset currentBufferSource
    }
    if (currentMediaStreamSource) {
        try { currentMediaStreamSource.disconnect(); } catch(e) {} 
        currentMediaStreamSource = null; // reset currentMediaStreamSource
    }
    if (currentMediaStream) {
        currentMediaStream.getTracks().forEach(t => { try { t.stop(); } catch(e) {} });
        currentMediaStream = null; // reset currentMediaStream
    }
    try { if (analyser) analyser.disconnect(); } catch(e) {}
}

export function setAudioBuffer(buffer) {

    // Play uploaded file

    ensureAudioContext(); // AudioContext on
    createOrResetAnalyser(); // creates AnalyserNode + audioData
    stopCurrentAudio(); // stops previous files or stream

    currentBufferSource = audioContext.createBufferSource();
    currentBufferSource.buffer = buffer;
    currentBufferSource.connect(analyser); // so analyser che compute FFT
    analyser.connect(audioContext.destination); // so the audio plays back
    currentBufferSource.start(0); // play
}

export function setAudioStream(stream) {

    // Play streamed audio

    ensureAudioContext(); // Audiocontext on
    createOrResetAnalyser(); // create AnalyserNode + audioData
    stopCurrentAudio(); // stops previous stream or file

    if (!stream || stream.getAudioTracks().length === 0) { // at least one audio track is needed
        console.error("no audio tracks");
        return;
    }
    currentMediaStream = stream;
    currentMediaStreamSource = audioContext.createMediaStreamSource(stream); // from MediaStream, create MediaStreamAudioSourceNode for web audio chain
    currentMediaStreamSource.connect(analyser); // so analyser can compute FFT
    // analyser.connect(audioContext.destination);  // would play the audio back, not needed for stream
    stream.getVideoTracks().forEach(track => {
        track.addEventListener('ended', () => {
            stopCurrentAudio();
            console.log("stream ended");
        });
    });
}

export function getBassStrength() {

    // Modulates BaseLevel depending on the FFT

    if (!audioData || !analyser || !audioContext) return audioVars.baseLevel; // if nothing is available -> baseLevel
    analyser.getByteFrequencyData(audioData); // fills audioData with FFT

    const sampleRate = audioContext.sampleRate;
    const fftSize = analyser.fftSize;
    const freqStep = sampleRate / fftSize; // bin length

    const minIndex = Math.max(0, Math.floor(audioVars.minFreq / freqStep)); // index of the bin corresponding to minFreq
    const maxIndex = Math.min(audioData.length - 1, Math.floor(audioVars.maxFreq / freqStep)); // index of the bin corresponding to maxFreq

    let maxValue = 0;
    for (let i = minIndex; i <= maxIndex; i++) {
        if (audioData[i] > maxValue) 
            maxValue = audioData[i];
    }

    let normValue = maxValue / 255.0;
    if (normValue > audioVars.bassLevel) 
        audioVars.bassLevel += (normValue - audioVars.bassLevel) * audioVars.attack;
    else 
        audioVars.bassLevel += (normValue - audioVars.bassLevel) * audioVars.release;
    if (audioVars.bassLevel < audioVars.threshold) 
        audioVars.bassLevel = audioVars.baseLevel;

    const punchy = Math.pow(audioVars.bassLevel, 2.5); // enchance peaks, power to 2.5
    return audioVars.baseLevel + punchy * 0.8;
}
