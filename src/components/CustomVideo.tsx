import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';
import type { MediaHandle } from './CustomAudio';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const VideoEl = styled.video<{ maxHeight?: string }>`
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
  max-height: ${p => p.maxHeight || 'none'};
  object-fit: contain;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  border-top: none;
`;

const CtrlBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.9);
  cursor: pointer;
  padding: 4px 6px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  &:hover { background: rgba(255,255,255,0.15); }
`;

const ProgressTrack = styled.div`
  width: min(70%, 70px);
  height: 6px;
  background: rgba(255,255,255,0.25);
  border-radius: 3px;
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

const ProgressThumb = styled.div<{ dragging?: boolean }>`
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.theme.accent.blue};
  transform: scale(0);
  translate: -50% -50%;
  transition: ${p => p.dragging ? 'none' : 'transform 0.12s'};
  pointer-events: none;
`;

const TimeLabel = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.85);
  font-family: ${p => p.theme.font.mono};
  white-space: nowrap;
  flex-shrink: 0;
`;

const VolumeWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const VolumeSlider = styled.input`
  width: min(30%, 70px);
  height: 6px;
  accent-color: #fff;
  cursor: pointer;
`;

const MuteBtn = styled(CtrlBtn)`
  font-size: 16px;
  color: rgba(255,255,255,0.9);
`;

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface CustomVideoProps {
  src: string;
  type?: string;
  autoPlay?: boolean;
  maxHeight?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const CustomVideo = forwardRef<MediaHandle, CustomVideoProps>(function CustomVideo(
  { src, type, autoPlay = false, maxHeight, onPlay, onPause, onEnded },
  outerRef
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef(0);

  useImperativeHandle(outerRef, () => ({
    play: async () => { await videoRef.current?.play().catch(() => {}); },
    pause: () => { videoRef.current?.pause(); },
    stop: () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    },
    get paused() { return videoRef.current?.paused ?? true; },
    get currentTime() { return videoRef.current?.currentTime ?? 0; },
    set currentTime(v: number) { if (videoRef.current) videoRef.current.currentTime = v; },
  }));

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onT = () => setCurrentTime(v.currentTime);
    const onD = () => { setDuration(v.duration); durationRef.current = v.duration; };
    const onP = () => { setPlaying(true); onPlay?.(); };
    const onPa = () => { setPlaying(false); onPause?.(); };
    const onE = () => { setPlaying(false); onEnded?.(); };
    v.addEventListener('timeupdate', onT);
    v.addEventListener('loadedmetadata', onD);
    v.addEventListener('durationchange', onD);
    v.addEventListener('play', onP);
    v.addEventListener('pause', onPa);
    v.addEventListener('ended', onE);
    return () => {
      v.removeEventListener('timeupdate', onT);
      v.removeEventListener('loadedmetadata', onD);
      v.removeEventListener('durationchange', onD);
      v.removeEventListener('play', onP);
      v.removeEventListener('pause', onPa);
      v.removeEventListener('ended', onE);
    };
  }, [src]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };

  const seekFromClientX = (clientX: number) => {
    const v = videoRef.current;
    const track = trackRef.current;
    if (!v || !durationRef.current || !track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = ratio * durationRef.current;
    v.currentTime = t;
    setCurrentTime(t);
  };

  const seekFromClientXRef = useRef(seekFromClientX);
  seekFromClientXRef.current = seekFromClientX;

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    seekFromClientXRef.current(e.clientX);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    seekFromClientXRef.current(e.clientX);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      seekFromClientXRef.current(e.clientX);
    };
    const onUp = () => { isDraggingRef.current = false; setIsDragging(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Wrapper>
      <VideoEl ref={videoRef} key={src} autoPlay={autoPlay} maxHeight={maxHeight}>
        <source src={src} type={type} />
      </VideoEl>
      <Controls>
        <CtrlBtn onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </CtrlBtn>
        <ProgressTrack ref={trackRef} onClick={seekTo} onMouseDown={handleMouseDown}>
          <ProgressFill style={{ width: `${pct}%` }} />
          <ProgressThumb dragging={isDragging} style={{ left: `${pct}%` }} />
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

export default CustomVideo;
