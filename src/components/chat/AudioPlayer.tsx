import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  src: string;
  isOwn?: boolean;
}

export default function AudioPlayer({ src, isOwn = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[250px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      <Button
        onClick={togglePlay}
        size="icon"
        variant="ghost"
        className={`h-8 w-8 rounded-full flex-shrink-0 ${
          isOwn
            ? 'hover:bg-gray-700/20 text-gray-800'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <div className="relative flex-1 h-1 group">
          <div
            className={`absolute h-full rounded-full ${
              isOwn ? 'bg-gray-400/40' : 'bg-gray-300'
            }`}
            style={{ width: '100%' }}
          />
          <div
            className={`absolute h-full rounded-full ${
              isOwn ? 'bg-gray-700' : 'bg-[#2db4af]'
            }`}
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="absolute w-full h-1 opacity-0 cursor-pointer"
          />
        </div>

        <span className={`text-xs tabular-nums flex-shrink-0 ${
          isOwn ? 'text-gray-800' : 'text-gray-600'
        }`}>
          {formatTime(isPlaying ? currentTime : duration)}
        </span>
      </div>
    </div>
  );
}
