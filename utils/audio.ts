// Audio encoding and decoding utilities for PCM data

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  base64String: string,
  audioContext: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const bytes = base64ToUint8Array(base64String);
  
  // Convert 16-bit PCM to float
  const dataInt16 = new Int16Array(bytes.buffer);
  const float32Data = new Float32Array(dataInt16.length);
  
  for (let i = 0; i < dataInt16.length; i++) {
    float32Data[i] = dataInt16[i] / 32768.0;
  }

  const audioBuffer = audioContext.createBuffer(1, float32Data.length, sampleRate);
  audioBuffer.copyToChannel(float32Data, 0);
  
  return audioBuffer;
}

export function createPcmBlob(float32Data: Float32Array, sampleRate: number = 16000): { blob: Blob, base64: string } {
  const l = float32Data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values
    let s = Math.max(-1, Math.min(1, float32Data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const buffer = new Uint8Array(int16.buffer);
  const base64 = arrayBufferToBase64(buffer);
  
  const blob = new Blob([buffer], { type: 'audio/pcm' });
  
  return { blob, base64 };
}

// Downsample buffer to target rate (simple decimation/interpolation)
export function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Float32Array {
  const sourceData = audioBuffer.getChannelData(0);
  const sourceSampleRate = audioBuffer.sampleRate;
  
  if (sourceSampleRate === targetSampleRate) {
    return sourceData;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(sourceData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalIndex = Math.floor(i * ratio);
    // Simple nearest neighbor for performance in real-time context
    // Ideally use linear interpolation for better quality
    result[i] = sourceData[originalIndex];
  }
  
  return result;
}