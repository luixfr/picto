import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, RefreshCw, Settings } from 'lucide-react';
import WORD_CATEGORIES from "./data/questions.json"
import toast, { Toaster } from 'react-hot-toast';

const TIMER_DURATION = 60;
const STORAGE_KEY = 'pictionary_used_words';
const TIMER_OPTIONS = [30, 45, 60, 75, 90, 120];
const ALL_PLAY_PROBABILITY = 0.2; // 20% chance for "All Play"

interface CategoryData {
  color: string;
  words: string[];
}

interface WordCategories {
  [key: string]: CategoryData;
}

interface AvailableWord {
  category: string;
  word: string;
  color: string;
}

export const PictionaryWordGenerator: React.FC = () => {
  const [usedWords, setUsedWords] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [isAllPlay, setIsAllPlay] = useState<boolean>(false);
  const [timerDuration, setTimerDuration] = useState<number>(TIMER_DURATION);
  const [timeRemaining, setTimeRemaining] = useState<number>(TIMER_DURATION);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [wordRevealed, setWordRevealed] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);


  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usedWords));
  }, [usedWords]);

  useEffect(() => {
    if (timerRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            // Play sound and vibrate when time is up
            playTimeUpAlert();
            // Show toast notification
            notify()
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning, timeRemaining]);

  useEffect(() => {
    // Cleanup toast timeout on unmount
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const playTimeUpAlert = () => {
    // Vibrate if supported (mobile devices)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]); // Pattern: vibrate-pause-vibrate-pause-vibrate
    }

    // Play sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create a beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';

      // Beep pattern: 3 short beeps
      const now = audioContext.currentTime;

      // First beep
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);

      // Second beep
      gainNode.gain.setValueAtTime(0.3, now + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      // Third beep
      gainNode.gain.setValueAtTime(0.3, now + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

      oscillator.stop(now + 0.6);
    } catch (error) {
      console.log('Audio playback not supported', error);
    }
  };

  const getAvailableWords = (): AvailableWord[] => {
    const available: AvailableWord[] = [];
    Object.entries(WORD_CATEGORIES as WordCategories).forEach(([categoryKey, categoryData]) => {
      categoryData.words.forEach(word => {
        if (!usedWords.includes(word)) {
          available.push({ category: categoryKey, word, color: categoryData.color });
        }
      });
    });
    return available;
  };

  const selectRandomWord = () => {
    const available = getAvailableWords();

    if (available.length === 0) {
      const shouldReset = window.confirm('All words have been used! Reset the word pool?');
      if (shouldReset) {
        resetGame();
      }
      return;
    }

    const selected = available[Math.floor(Math.random() * available.length)];
    const shouldBeAllPlay = selected.category == 'random' ? true : Math.random() < ALL_PLAY_PROBABILITY;

    setCurrentCategory(selected.category);
    setCurrentWord(selected.word);
    setIsAllPlay(shouldBeAllPlay);
    setUsedWords([...usedWords, selected.word]);
    setTimeRemaining(timerDuration);
    setTimerRunning(false);
    setWordRevealed(false);
  };

  const startTimer = () => {
    if (currentWord) {
      setTimerRunning(true);
    }
  };

  const stopTimer = () => {
    setTimerRunning(false);
  };

  const restartTimer = () => {
    setTimeRemaining(timerDuration);
    setTimerRunning(true);
  };

  const changeTimerDuration = (duration: number) => {
    setTimerDuration(duration);
    setTimeRemaining(duration);
    setTimerRunning(false);
  };

  const resetGame = () => {
    setUsedWords([]);
    setCurrentCategory(null);
    setCurrentWord(null);
    setIsAllPlay(false);
    setTimeRemaining(timerDuration);
    setTimerRunning(false);
    setWordRevealed(false);
    localStorage.removeItem(STORAGE_KEY);
  };


  const handleWordBoxInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setWordRevealed(true);
  };

  const handleWordBoxRelease = () => {
    setWordRevealed(false);
  };

  const getCategoryColor = (): string => {
    if (!currentCategory) return '#9ca3af';
    const colorMap: { [key: string]: string } = {
      yellow: '#fbbf24',
      blue: '#3b82f6',
      orange: '#f97316',
      green: '#22c55e',
      red: '#ef4444'
    };
    return colorMap[(WORD_CATEGORIES as WordCategories)[currentCategory]?.color] || '#9ca3af';
  };

  const formatCategoryName = (): string => {
    if (!currentCategory) return 'No Category';
    return currentCategory
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const availableCount = getAvailableWords().length;
  const totalWords = Object.values(WORD_CATEGORIES as WordCategories).reduce((sum, cat) => sum + cat.words.length, 0);

  const notify = () => toast.custom(<div className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
    <span className="text-4xl">⏰</span>
    <div>
      <p className="text-2xl font-black">TIME'S UP!</p>
      <p className="text-sm opacity-90">Click "Next Word" to continue</p>
    </div>
  </div>, { id: "time_out_toast" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 flex items-center justify-center relative">

      {/* Time's Up Toast Notification */}
      <Toaster />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Timer Settings</h2>
            <div className="space-y-3">
              {TIMER_OPTIONS.map(duration => (
                <button
                  key={duration}
                  onClick={() => {
                    changeTimerDuration(duration);
                    setShowSettings(false);
                  }}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${timerDuration === duration
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {duration < 60 ? `${duration} seconds` : `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} minutes`}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 max-w-3xl w-full">

        <div className='flex justify-around'>
          {/* Reset Game Button - Top Right Corner */}
          <div>
            <button
              onClick={resetGame}
              className="p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-lg z-10"
              title="Reset Game"
            >
              <RefreshCw size={24} />
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 mb-2">
              Pictionary
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">Word Generator</p>
          </div>


          {/* Settings Button - Top Left Corner */}
          <div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-lg z-10"
              title="Settings"
            >
              <Settings size={24} />
            </button>
          </div>
        </div>
        {/* Word Display Area */}
        <div
          className="rounded-2xl p-8 sm:p-12 mb-6 min-h-48 flex items-center justify-center shadow-lg relative transition-all duration-300 cursor-pointer select-none"
          style={{
            backgroundColor: currentCategory ? getCategoryColor() : '#6b7280'
          }}
          onMouseDown={currentWord ? handleWordBoxInteraction : undefined}
          onMouseUp={handleWordBoxRelease}
          onMouseLeave={handleWordBoxRelease}
          onTouchStart={currentWord ? handleWordBoxInteraction : undefined}
          onTouchEnd={handleWordBoxRelease}
        >
          {currentCategory && (
            <div
              className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: getCategoryColor()
              }}
            >
              {formatCategoryName()}
            </div>
          )}

          {isAllPlay && currentCategory && (
            <div
              className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md animate-pulse"
              style={{
                backgroundColor: '#ef4444',
                color: 'white'
              }}
            >
              All Play
            </div>
          )}

          <div className="text-center w-full pointer-events-none">
            {currentWord ? (
              <>
                <div className="text-xs sm:text-sm mb-4 uppercase tracking-widest font-semibold" style={{ color: 'rgba(0, 0, 0, 0.4)' }}>
                  {wordRevealed ? 'Word to Draw' : 'Hidden Word'}
                </div>
                {wordRevealed ? (
                  <div className="text-4xl sm:text-6xl font-black text-white break-words px-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                    {currentWord}
                  </div>
                ) : (
                  <div className="text-xl sm:text-2xl text-white opacity-60 italic">
                    Hold box to reveal
                  </div>
                )}
              </>
            ) : (
              <div className="text-xl sm:text-2xl text-gray-400 italic ">
                Click "Next Word" to begin
              </div>
            )}
          </div>
        </div>


        {/* Timer Display */}
        <div className="text-center mb-6">
          <div
            className="text-6xl sm:text-7xl font-black mb-2 transition-colors duration-300"
            style={{
              color: timeRemaining <= 10 && timeRemaining > 0 ? '#ef4444' :
                timeRemaining === 0 ? '#9ca3af' : '#1f2937'
            }}
          >
            {formatTime(timeRemaining)}
          </div>
          <div className="text-gray-500 text-sm sm:text-base font-medium">
            {timerRunning ? 'Time Remaining' : timeRemaining === 0 ? 'Time Up!' : 'Ready'}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={timerRunning ? stopTimer : startTimer}
            disabled={!currentWord}
            className={`py-4 ${timerRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md`}
          >
            {timerRunning ? (
              <>
                <Square size={20} />
                <span className="hidden sm:inline">Stop</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span className="hidden sm:inline">Start</span>
              </>
            )}
          </button>

          <button
            onClick={restartTimer}
            disabled={!currentWord}
            className="py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-2 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
          >
            <RefreshCw size={20} />
            <span className="hidden sm:inline">Restart timer</span>
          </button>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={selectRandomWord}
            className="py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-3 font-bold text-lg shadow-lg"
          >
            <RotateCcw size={24} />
            Next Word
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 text-center">
          <div className="inline-block bg-gray-100 px-6 py-3 rounded-full">
            <span className="text-sm font-semibold text-gray-700">
              Words Remaining: <span className="text-indigo-600 font-bold">{availableCount}</span> / {totalWords}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PictionaryWordGenerator;