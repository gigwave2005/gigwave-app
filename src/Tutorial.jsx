import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * Interactive Tutorial Component for GigWave
 * Shows step-by-step guidance with overlays and highlights
 * UPDATED: Now includes Gig Playlists steps for artists
 */
const Tutorial = ({ userType, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Tutorial steps for Artists (NOW 9 STEPS with Gig Playlists)
  const artistSteps = [
    {
      id: 'welcome',
      title: '🎸 Welcome to GigWave!',
      description: 'Transform your live gigs with real-time audience interaction. Let\'s show you how it works!',
      targetElement: null,
      position: 'center',
      image: '🌊',
    },
    {
      id: 'master-playlist',
      title: '📚 Master Playlist',
      description: 'First, build your song library. This is your complete collection - all the songs you know how to play!',
      targetElement: '.artist-nav-tab:first-child',
      position: 'bottom',
      action: 'Click on "Master Playlist" tab',
    },
    {
      id: 'add-songs',
      title: '🎵 Add Your Songs',
      description: 'Search iTunes or add songs manually. Build your complete music library here. The more songs, the better!',
      targetElement: '.btn-neon',
      position: 'bottom',
      highlight: true,
    },
    {
      id: 'gig-playlists',
      title: '🎸 Gig Playlists',
      description: 'Create custom playlists for different venues or moods! Pick songs from your master playlist and organize them by gig type.',
      targetElement: '.artist-nav-tab:nth-child(2)',
      position: 'bottom',
      action: 'Click on "Gig Playlists" tab',
      highlight: true,
    },
    {
      id: 'create-playlist',
      title: '📝 Organize Your Sets',
      description: 'Example: Create "Rock Bar Friday" with high-energy songs, or "Acoustic Cafe" with mellow tracks. Playlists help you stay organized!',
      targetElement: null,
      position: 'center',
      image: '🎼',
    },
    {
      id: 'create-gig',
      title: '⚡ Create Your First Gig',
      description: 'Ready to perform? Create a gig with venue details, date, time, and location. Pick a playlist or use your full master library!',
      targetElement: 'button:contains("Create Gig")',
      position: 'bottom',
      highlight: true,
    },
    {
      id: 'go-live',
      title: '🔴 Go Live',
      description: 'When it\'s showtime, click "Go Live" to activate your gig. Your audience can then join and start voting!',
      targetElement: 'button:contains("Go Live")',
      position: 'top',
      highlight: true,
    },
    {
      id: 'live-mode',
      title: '🎤 Live Mode Features',
      description: 'In live mode you\'ll see: Real-time votes, song requests from fans, audience count, and your queue sorted by popularity!',
      targetElement: null,
      position: 'center',
      image: '⚡',
    },
    {
      id: 'done',
      title: '🎉 You\'re All Set!',
      description: 'That\'s it! Build your library, create playlists, go live, and watch the magic happen. Rock on! 🎸',
      targetElement: null,
      position: 'center',
      image: '🚀',
    },
  ];

  // Tutorial steps for Audience (UNCHANGED - 7 STEPS)
  const audienceSteps = [
    {
      id: 'welcome',
      title: '👋 Welcome to GigWave!',
      description: 'You\'re about to change the way you experience live music. Let\'s show you how to connect with artists!',
      targetElement: null,
      position: 'center',
      image: '🌊',
    },
    {
      id: 'discover',
      title: '🔍 Discover Live Gigs',
      description: 'Browse live and upcoming gigs near you. See who\'s performing, where, and when!',
      targetElement: '.gig-card:first-child',
      position: 'bottom',
      highlight: true,
    },
    {
      id: 'join-gig',
      title: '🎸 Join a Gig',
      description: 'Click on any gig to see details. Scan the QR code at the venue or click "Join Gig" to connect!',
      targetElement: 'button:contains("View Details")',
      position: 'top',
      highlight: true,
    },
    {
      id: 'voting',
      title: '⚡ Vote for Songs',
      description: 'See the setlist and vote for songs you want to hear! Your votes influence what the artist plays next.',
      targetElement: '.vote-button',
      position: 'bottom',
      highlight: true,
    },
    {
      id: 'request',
      title: '🎤 Request Songs',
      description: 'Can\'t find your favorite? Request it! Add a message to tell the artist why you want to hear it.',
      targetElement: 'button:contains("Request Song")',
      position: 'top',
      highlight: true,
    },
    {
      id: 'engage',
      title: '🔥 Stay Engaged',
      description: 'Watch votes update in real-time, see what others are requesting, and be part of the energy!',
      targetElement: null,
      position: 'center',
      image: '⚡',
    },
    {
      id: 'done',
      title: '🎉 Ready to Rock!',
      description: 'That\'s all you need! Find a gig, join, vote, and make every concert YOUR concert. Enjoy! 🌊',
      targetElement: null,
      position: 'center',
      image: '🎸',
    },
  ];

  const steps = userType === 'artist' ? artistSteps : audienceSteps;
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => onComplete(), 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => onSkip(), 300);
  };

  if (!isVisible) return null;

  // Center modal style
  if (currentStepData.position === 'center') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div className="bg-gradient-to-br from-purple-900/90 to-black/90 border-2 border-neon rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-scaleIn"
          style={{
            boxShadow: '0 0 40px rgba(57, 255, 20, 0.3), 0 0 80px rgba(0, 217, 255, 0.2)'
          }}
        >
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          {/* Large emoji/icon */}
          {currentStepData.image && (
            <div className="text-7xl text-center mb-6 animate-bounce">
              {currentStepData.image}
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-neon'
                    : index < currentStep
                    ? 'w-2 bg-electric'
                    : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            {currentStepData.title}
          </h2>
          <p className="text-gray-300 text-lg mb-8 text-center leading-relaxed">
            {currentStepData.description}
          </p>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-3 px-6 bg-neon hover:bg-neon/80 text-black rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              style={{
                boxShadow: '0 0 20px rgba(57, 255, 20, 0.5)'
              }}
            >
              {currentStep === totalSteps - 1 ? 'Get Started' : 'Next'}
              {currentStep < totalSteps - 1 && <ChevronRight size={20} />}
            </button>
          </div>

          {/* Skip link */}
          {currentStep < totalSteps - 1 && (
            <button
              onClick={handleSkip}
              className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    );
  }

  // Tooltip/pointer style (for specific elements)
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn pointer-events-auto" />
      
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 z-[10000] text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all pointer-events-auto"
      >
        <X size={24} />
      </button>

      {/* Tooltip box */}
      <div
        className={`absolute z-[10000] bg-gradient-to-br from-purple-900 to-black border-2 border-electric rounded-xl p-6 max-w-sm animate-scaleIn pointer-events-auto ${
          currentStepData.position === 'top' ? 'bottom-24' : 'top-24'
        }`}
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 40px rgba(0, 217, 255, 0.4)'
        }}
      >
        {/* Step number */}
        <div className="absolute -top-3 left-6 bg-neon text-black text-xs font-bold px-3 py-1 rounded-full">
          {currentStep + 1} / {totalSteps}
        </div>

        {/* Arrow pointer */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
            currentStepData.position === 'top'
              ? 'top-full border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-electric'
              : 'bottom-full border-l-[12px] border-r-[12px] border-b-[12px] border-l-transparent border-r-transparent border-b-electric'
          }`}
        />

        {/* Content */}
        <h3 className="text-xl font-bold text-white mb-2">
          {currentStepData.title}
        </h3>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          {currentStepData.description}
        </p>

        {/* Action hint */}
        {currentStepData.action && (
          <div className="bg-neon/20 border border-neon rounded-lg p-2 mb-4">
            <p className="text-neon text-xs font-bold text-center">
              👉 {currentStepData.action}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              onClick={handlePrevious}
              className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-2 px-4 bg-electric hover:bg-electric/80 text-black rounded-lg font-bold text-sm transition-all"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>

      {/* Highlight effect on target element (if specified) */}
      {currentStepData.highlight && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute bg-neon/20 rounded-lg animate-pulse"
            style={{
              width: '300px',
              height: '80px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 4px rgba(57, 255, 20, 0.5), 0 0 40px rgba(57, 255, 20, 0.3)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Tutorial;
