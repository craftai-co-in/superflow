import { useState, useRef, useEffect } from "react";
import { Mic, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import AuthModal from "./auth-modal";
import RecordingResultsModal from "./recording-results-modal";

export default function NewHeroSection() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStage, setRecordingStage] = useState<'idle' | 'recording' | 'recorded' | 'processing'>('idle');
  const [processingStage, setProcessingStage] = useState<'transcribing' | 'understanding' | 'narrating' | 'ready'>('transcribing');
  const [transcript, setTranscript] = useState('');
  const [processedContent, setProcessedContent] = useState('');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const processingMessages = [
    "Transcribing voice...",
    "Understanding context...",
    "Narrating story...",
    "Content is getting ready..."
  ];

  const uploadMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await apiRequest('POST', '/api/transcribe', formData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProcessingStage('ready');
      setTranscript(data.transcript);
      setProcessedContent(data.processedContent);
      setTimeout(() => {
        setRecordingStage('idle');
        setShowResultsModal(true);
      }, 1000);
    },
    onError: (error: any) => {
      setRecordingStage('recorded');
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process recording. Please try again.",
        variant: "destructive",
      });
    }
  });

  const startRecording = async () => {
    // Track recording start from hero section
    trackEvent('start_recording', 'hero_section', 'quick_record');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        uploadMutation.mutate(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStage('recording');
      setCountdown(30);
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          setRecordingStage('recorded');
        }
      }, 30000);
      
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleConvertToText = () => {
    setRecordingStage('processing');
    setProcessingStage('transcribing');
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCTAClick = () => {
    // Track CTA click
    trackEvent('cta_click', 'landing_page', 'hero_section');
    
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  };

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, countdown]);

  // Processing stage cycling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingStage === 'processing') {
      interval = setInterval(() => {
        setProcessingStage((prev) => {
          const stages: ('transcribing' | 'understanding' | 'narrating' | 'ready')[] = 
            ['transcribing', 'understanding', 'narrating', 'ready'];
          const currentIndex = stages.indexOf(prev);
          return stages[(currentIndex + 1) % stages.length];
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [recordingStage]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Speak Aloud.
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {" "}Transform{" "}
              </span>
              your idea into a story.
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Create content at the speed of thought.
            </p>

            {!isAuthenticated && (
              <div className="flex justify-center lg:justify-start">
                <Button 
                  onClick={handleCTAClick}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  data-testid="button-get-started"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Creating Now
                </Button>
              </div>
            )}
          </div>

          {/* Right Content - Interactive Voice Card */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-white shadow-2xl border-0 overflow-hidden">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="relative mb-6">
                    <button
                      onClick={startRecording}
                      disabled={isRecording || recordingStage === 'processing'}
                      className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto relative transition-all duration-200 ${
                        isRecording 
                          ? 'bg-red-500 animate-pulse' 
                          : recordingStage === 'processing'
                          ? 'bg-yellow-500'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-105'
                      } disabled:cursor-not-allowed`}
                    >
                      <Mic className="w-12 h-12 text-white" />
                      {isRecording && (
                        <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
                      )}
                      {!isRecording && recordingStage === 'idle' && (
                        <>
                          <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-purple-200 animate-ping"></div>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    Click button, share your idea, feel the magic
                  </h3>
                  
                  {recordingStage === 'idle' && (
                    <p className="text-gray-600">Click the microphone to start recording</p>
                  )}
                  
                  {recordingStage === 'recording' && (
                    <div className="text-center">
                      <p className="text-red-600 font-semibold">Recording... {countdown}s</p>
                    </div>
                  )}
                  
                  {recordingStage === 'recorded' && (
                    <Button 
                      onClick={handleConvertToText}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold"
                    >
                      Convert to Text
                    </Button>
                  )}
                  
                  {recordingStage === 'processing' && (
                    <div className="text-center">
                      <p className="text-blue-600 font-semibold">
                        {processingMessages[['transcribing', 'understanding', 'narrating', 'ready'].indexOf(processingStage)]}
                        <span className="animate-pulse">...</span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 right-20 hidden lg:block">
          <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <Zap className="w-6 h-6 text-yellow-800" />
          </div>
        </div>
        
        <div className="absolute bottom-20 left-20 hidden lg:block">
          <div className="w-8 h-8 bg-blue-400 rounded-full animate-pulse"></div>
        </div>
        
        <div className="absolute top-1/2 right-10 hidden lg:block">
          <div className="w-6 h-6 bg-purple-400 rounded-full animate-ping"></div>
        </div>
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
      
      {showResultsModal && (
        <RecordingResultsModal
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          transcript={transcript}
          processedContent={processedContent}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
}