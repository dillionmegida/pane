import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import styled, { keyframes, css } from 'styled-components';

const bounce1 = keyframes`0%,100%{height:4px}50%{height:18px}`;
const bounce2 = keyframes`0%,100%{height:8px}50%{height:24px}`;
const bounce3 = keyframes`0%,100%{height:6px}50%{height:20px}`;
const bounce4 = keyframes`0%,100%{height:10px}50%{height:28px}`;
const bounce5 = keyframes`0%,100%{height:5px}50%{height:16px}`;
const bounce6 = keyframes`0%,100%{height:12px}50%{height:22px}`;
const bounce7 = keyframes`0%,100%{height:7px}50%{height:26px}`;
const bounce8 = keyframes`0%,100%{height:9px}50%{height:30px}`;

const BOUNCES = [bounce1, bounce2, bounce3, bounce4, bounce5, bounce6, bounce7, bounce8];
const DELAYS = ['0s', '0.1s', '0.2s', '0.05s', '0.15s', '0.25s', '0.08s', '0.18s'];

const Wrapper = styled.div`
  width: 100%;
  background: ${p => p.theme.bg.secondary};
  border-radius: ${p => p.theme.radius.md};
  overflow: hidden;
  border: 1px solid ${p => p.theme.border.subtle};
`;

const WaveSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 16px 20px 10px;
  height: 60px;
  background: ${p => p.theme.bg.primary};
`;

const Bar = styled.div<{ playing: boolean; idx: number }>`
  width: 4px;
  border-radius: 2px;
  background: ${p => p.playing ? p.theme.accent.blue : p.theme.text.tertiary};
  transition: background 0.3s;
  ${p => p.playing
    ? css`
        animation: ${BOUNCES[p.idx % BOUNCES.length]} ${0.55 + (p.idx * 0.07)}s ease-in-out infinite;
        animation-delay: ${DELAYS[p.idx % DELAYS.length]};
      `
    : 'height: 4px;'
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 8px;
  background: ${p => p.theme.bg.secondary};
`;

const CtrlBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.primary};
  cursor: pointer;
  padding: 2px 4px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 4px;
  background: ${p => p.theme.bg.elevated};
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  overflow: visible;
  &:hover > div:last-child { transform: scale(1); }
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${p => p.theme.accent.blue};
  border-radius: 2px;
  pointer-events: none;
`;

const ProgressThumb = styled.div`
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.theme.accent.blue};
  transform: scale(0);
  translate: -50% -50%;
  transition: transform 0.12s;
  pointer-events: none;
`;

const TimeLabel = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
  white-space: nowrap;
  flex-shrink: 0;
`;

const VolumeWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const VolumeSlider = styled.input`
  width: 56px;
  accent-color: ${p => p.theme.accent.blue};
  cursor: pointer;
`;

const HiddenAudio = styled.audio`
  display: none;
`;

const MuteBtn = styled(CtrlBtn)`
  font-size: 12px;
`;

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const NUM_BARS = 24;

export interface MediaHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  paused: boolean;
  currentTime: number;
}

interface CustomAudioProps {
  src: string;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const CustomAudio = forwardRef<MediaHandle, CustomAudioProps>(function CustomAudio(
  { src, autoPlay = false, onPlay, onPause, onEnded },
  outerRef
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useImperativeHandle(outerRef, () => ({
    play: () => { audioRef.current?.play(); },
    pause: () => { audioRef.current?.pause(); },
    stop: () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    },
    get paused() { return audioRef.current?.paused ?? true; },
    get currentTime() { return audioRef.current?.currentTime ?? 0; },
    set currentTime(v: number) { if (audioRef.current) audioRef.current.currentTime = v; },
  }));

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onT = () => setCurrentTime(a.currentTime);
    const onD = () => setDuration(a.duration);
    const onP = () => { setPlaying(true); onPlay?.(); };
    const onPa = () => { setPlaying(false); onPause?.(); };
    const onE = () => { setPlaying(false); onEnded?.(); };
    a.addEventListener('timeupdate', onT);
    a.addEventListener('loadedmetadata', onD);
    a.addEventListener('durationchange', onD);
    a.addEventListener('play', onP);
    a.addEventListener('pause', onPa);
    a.addEventListener('ended', onE);
    return () => {
      a.removeEventListener('timeupdate', onT);
      a.removeEventListener('loadedmetadata', onD);
      a.removeEventListener('durationchange', onD);
      a.removeEventListener('play', onP);
      a.removeEventListener('pause', onPa);
      a.removeEventListener('ended', onE);
    };
  }, [src]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    const next = !muted;
    a.muted = next;
    setMuted(next);
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Wrapper>
      <HiddenAudio ref={audioRef} key={src} autoPlay={autoPlay}>
        <source src={src} />
      </HiddenAudio>
      <WaveSection>
        {Array.from({ length: NUM_BARS }).map((_, i) => (
          <Bar key={i} idx={i} playing={playing} />
        ))}
      </WaveSection>
      <Controls>
        <CtrlBtn onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </CtrlBtn>
        <ProgressTrack onClick={seekTo}>
          <ProgressFill style={{ width: `${pct}%` }} />
          <ProgressThumb style={{ left: `${pct}%` }} />
        </ProgressTrack>
        <TimeLabel>{formatTime(currentTime)} / {formatTime(duration)}</TimeLabel>
        <VolumeWrap>
          <MuteBtn onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </MuteBtn>
          <VolumeSlider
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolume}
          />
        </VolumeWrap>
      </Controls>
    </Wrapper>
  );
});

export default CustomAudio;
