import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import styled, { keyframes } from 'styled-components';

const Wrapper = styled.div`
  width: 100%;
  height: ${p => p.maxHeight ? 'auto' : '100%'};
  background: #000;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const VideoEl = styled.video`
  width: 100%;
  height: ${p => p.maxHeight ? 'auto' : '100%'};
  flex: ${p => p.maxHeight ? '0 0 auto' : '1'};
  display: block;
  background: #000;
  max-height: ${p => p.maxHeight || 'none'};
  object-fit: contain;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding: 6px 10px;
  background: ${p => p.theme.bg.secondary};
  border-top: 1px solid ${p => p.theme.border.subtle};
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
  justify-content: center;
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

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const CustomVideo = forwardRef(function CustomVideo(
  { src, type, autoPlay = false, maxHeight, onPlay, onPause, onEnded },
  outerRef
) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useImperativeHandle(outerRef, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    stop: () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    },
    get paused() { return videoRef.current?.paused ?? true; },
    get currentTime() { return videoRef.current?.currentTime ?? 0; },
    set currentTime(v) { if (videoRef.current) videoRef.current.currentTime = v; },
  }));

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onT = () => setCurrentTime(v.currentTime);
    const onD = () => setDuration(v.duration);
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
    if (v.paused) v.play(); else v.pause();
  };

  const seekTo = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
  };

  const handleVolume = (e) => {
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
      <VideoEl
        ref={videoRef}
        key={src}
        autoPlay={autoPlay}
        maxHeight={maxHeight}
      >
        <source src={src} type={type} />
      </VideoEl>
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
          <CtrlBtn onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} style={{ fontSize: 12 }}>
            {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </CtrlBtn>
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
