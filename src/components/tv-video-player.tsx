import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type FullscreenElement = HTMLElement & {
  mozRequestFullScreen?: () => void | Promise<void>;
  msRequestFullscreen?: () => void | Promise<void>;
  webkitRequestFullscreen?: () => void | Promise<void>;
  webkitEnterFullscreen?: () => void;
};

type FullscreenDocument = Document & {
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  mozCancelFullScreen?: () => void | Promise<void>;
  msExitFullscreen?: () => void | Promise<void>;
  webkitExitFullscreen?: () => void | Promise<void>;
};

type TvVideoPlayerProps = {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
};

const legacyKeyNames: Record<number, string> = {
  13: "Enter",
  27: "Escape",
  32: " ",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  70: "f",
  77: "m",
  174: "MediaVolumeDown",
  175: "MediaVolumeUp",
  178: "MediaStop",
  179: "MediaPlayPause",
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function callMaybeAsync(result: void | Promise<void>, onError: () => void) {
  if (result && typeof (result as Promise<void>).then === "function") {
    void (result as Promise<void>).catch(onError);
  }
}

function getFullscreenDocument() {
  return document as FullscreenDocument;
}

function getFullscreenElement() {
  const fullscreenDocument = getFullscreenDocument();
  return (
    fullscreenDocument.fullscreenElement ||
    fullscreenDocument.webkitFullscreenElement ||
    fullscreenDocument.mozFullScreenElement ||
    fullscreenDocument.msFullscreenElement ||
    null
  );
}

export function TvVideoPlayer({
  src,
  poster,
  title = "Video",
  className = "",
  autoPlay = false,
  muted = false,
  loop = false,
}: TvVideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastAudibleVolume = useRef(0.8);
  const playWhenReady = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 0.8);
  const [isMuted, setIsMuted] = useState(muted);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px" },
    );
    observer.observe(player);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    setIsMuted(muted);
    if (!muted && video.volume > 0) {
      lastAudibleVolume.current = video.volume;
      setVolume(video.volume);
    }
  }, [muted]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(getFullscreenElement()));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
    };
  }, []);

  const syncVolume = useCallback((nextVolume: number) => {
    const video = videoRef.current;
    const normalizedVolume = Math.max(0, Math.min(1, nextVolume));
    if (video) {
      video.volume = normalizedVolume;
      video.muted = normalizedVolume === 0;
    }
    if (normalizedVolume > 0) lastAudibleVolume.current = normalizedVolume;
    setVolume(normalizedVolume);
    setIsMuted(normalizedVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      const restoredVolume = lastAudibleVolume.current || 0.8;
      video.muted = false;
      video.volume = restoredVolume;
      setVolume(restoredVolume);
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, []);

  const playPendingVideo = useCallback(() => {
    if (!playWhenReady.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 1) return;
    playWhenReady.current = false;
    const playResult = video.play();
    if (playResult && typeof playResult.then === "function") {
      void playResult.catch(() => setHasError(true));
    }
  }, []);

  const togglePlay = useCallback(() => {
    setShouldLoad(true);
    setHasError(false);
    const video = videoRef.current;
    if (!video) {
      playWhenReady.current = true;
      return;
    }
    playWhenReady.current = false;
    if (video.paused || video.ended) {
      const playResult = video.play();
      if (playResult && typeof playResult.then === "function") {
        void playResult.catch(() => setHasError(true));
      }
    } else {
      video.pause();
    }
  }, []);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  }, []);

  const changeVolumeBy = useCallback(
    (amount: number) => {
      const video = videoRef.current;
      if (!video) return;
      const currentVolume = video.muted ? 0 : video.volume;
      syncVolume(currentVolume + amount);
    },
    [syncVolume],
  );

  const exitFullscreen = useCallback(() => {
    const fullscreenDocument = getFullscreenDocument();
    const exit =
      fullscreenDocument.exitFullscreen ||
      fullscreenDocument.webkitExitFullscreen ||
      fullscreenDocument.mozCancelFullScreen ||
      fullscreenDocument.msExitFullscreen;
    if (exit) {
      try {
        callMaybeAsync(exit.call(fullscreenDocument), () => setIsTheater(true));
      } catch {
        setIsTheater(true);
      }
    }
    setIsFullscreen(false);
  }, []);

  const enterFullscreen = useCallback(() => {
    const player = playerRef.current as FullscreenElement | null;
    const video = videoRef.current as FullscreenElement | null;
    if (!player) return;

    const request =
      player.requestFullscreen ||
      player.webkitRequestFullscreen ||
      player.mozRequestFullScreen ||
      player.msRequestFullscreen;
    if (request) {
      try {
        callMaybeAsync(request.call(player), () => {
          if (video?.webkitEnterFullscreen) video.webkitEnterFullscreen();
          else setIsTheater(true);
        });
        return;
      } catch {
        // Fall through to the webOS video fullscreen API or theater mode.
      }
    }

    if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }
    setIsTheater(true);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isTheater || isFullscreen || getFullscreenElement()) {
      setIsTheater(false);
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, isFullscreen, isTheater]);

  const handleRemoteKey = useCallback(
    (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const key = event.key || legacyKeyNames[event.keyCode] || "";
      const target = event.target as HTMLElement | null;
      const isFormControl =
        target?.tagName === "INPUT" || target?.tagName === "BUTTON" || target?.tagName === "SELECT";
      const isArrow =
        key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";

      if (isFormControl && (isArrow || key === " " || key === "Enter")) return;
      if (key === " " || key === "Enter" || key === "MediaPlayPause") {
        event.preventDefault();
        togglePlay();
      } else if (key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-5);
      } else if (key === "ArrowRight") {
        event.preventDefault();
        seekBy(5);
      } else if (key === "ArrowUp" || key === "MediaVolumeUp") {
        event.preventDefault();
        changeVolumeBy(0.1);
      } else if (key === "ArrowDown" || key === "MediaVolumeDown") {
        event.preventDefault();
        changeVolumeBy(-0.1);
      } else if (key === "f" || key === "F") {
        event.preventDefault();
        toggleFullscreen();
      } else if (key === "m" || key === "M") {
        event.preventDefault();
        toggleMute();
      } else if (key === "Escape" && isTheater) {
        event.preventDefault();
        setIsTheater(false);
      }
    },
    [changeVolumeBy, isTheater, seekBy, toggleFullscreen, toggleMute, togglePlay],
  );

  useEffect(() => {
    if (!isActive) return;
    document.addEventListener("keydown", handleRemoteKey);
    return () => document.removeEventListener("keydown", handleRemoteKey);
  }, [handleRemoteKey, isActive]);

  const handleWrapperKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.tagName === "BUTTON" || target?.tagName === "INPUT") return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePlay();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) setCurrentTime(video.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setCurrentTime(video.currentTime || 0);
    if (!muted) {
      video.volume = 0.8;
      lastAudibleVolume.current = 0.8;
      setVolume(0.8);
    }
    setReady(true);
    playPendingVideo();
  };

  const handleProgressChange = (value: string) => {
    const video = videoRef.current;
    const nextTime = Number(value);
    if (video && Number.isFinite(nextTime)) video.currentTime = nextTime;
  };

  const handleVolumeChange = (value: string) => {
    syncVolume(Number(value));
  };

  const playerClassName =
    `tv-video-player${isTheater ? " tv-video-player--theater" : ""}${isFullscreen ? " tv-video-player--fullscreen" : ""} ${className}`.trim();

  return (
    <div
      ref={playerRef}
      className={playerClassName}
      tabIndex={0}
      role="region"
      aria-label={title}
      onFocus={() => setIsActive(true)}
      onClick={() => setIsActive(true)}
      onTouchStart={() => setIsActive(true)}
      onKeyDown={handleWrapperKeyDown}
      onDoubleClick={toggleFullscreen}
    >
      <div className="tv-video-player__stage">
        {shouldLoad ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            autoPlay={autoPlay}
            muted={muted}
            loop={loop}
            playsInline
            preload="metadata"
            onCanPlay={() => {
              setReady(true);
              playPendingVideo();
            }}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setHasError(true);
              setReady(true);
            }}
            onClick={togglePlay}
            aria-label={title}
          />
        ) : (
          <div
            className="tv-video-player__poster"
            style={poster ? { backgroundImage: `url("${poster}")` } : undefined}
          />
        )}
        {!isPlaying && !hasError && (
          <button
            type="button"
            className="tv-video-player__center-button"
            onClick={togglePlay}
            aria-label="تشغيل الفيديو"
          >
            <Play className="tv-video-player__center-icon" fill="currentColor" />
          </button>
        )}
        {hasError && <p className="tv-video-player__error">تعذر تشغيل الفيديو. حاول مرة أخرى.</p>}
        {shouldLoad && !ready && !hasError && (
          <span className="tv-video-player__loading">جارٍ تحميل الفيديو…</span>
        )}
        {isTheater && (
          <button
            type="button"
            className="tv-video-player__close-theater"
            onClick={() => setIsTheater(false)}
            aria-label="إغلاق ملء الشاشة"
          >
            <Minimize2 />
          </button>
        )}
      </div>

      <div className="tv-video-player__controls" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="tv-video-player__control-button"
          onClick={togglePlay}
          aria-label={isPlaying ? "إيقاف الفيديو مؤقتًا" : "تشغيل الفيديو"}
        >
          {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        </button>
        <span className="tv-video-player__time" aria-live="off">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          className="tv-video-player__progress"
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={Math.min(currentTime, duration || 1)}
          onChange={(event) => handleProgressChange(event.target.value)}
          disabled={!duration}
          aria-label="تقدم الفيديو"
        />
        <button
          type="button"
          className="tv-video-player__control-button"
          onClick={toggleMute}
          aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {isMuted ? <VolumeX /> : <Volume2 />}
        </button>
        <input
          className="tv-video-player__volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(event) => handleVolumeChange(event.target.value)}
          aria-label="مستوى الصوت"
        />
        <button
          type="button"
          className="tv-video-player__control-button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen || isTheater ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
        >
          {isFullscreen || isTheater ? <Minimize2 /> : <Maximize2 />}
        </button>
      </div>
    </div>
  );
}
