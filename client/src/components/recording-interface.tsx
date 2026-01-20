import { useState, useRef, useCallback } from "react";
import { Mic, Square, Copy, RotateCcw, Sparkles, Instagram, Facebook, Youtube, Loader2, LogIn, Clock, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";
import AuthModal from "./auth-modal";
import PremiumModal from "./premium-modal";
import type { SocialMediaContent } from "@shared/schema";

interface TranscriptionResponse {
  transcript: string;
  processedContent: string;
  success?: boolean;
}

interface SocialMediaResponse {
  socialContent: SocialMediaContent;
  success?: boolean;
}

interface ApiError {
  error: string;
  message: string;
  type: string;
  details?: string;
}

export default function RecordingInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [maxDuration, setMaxDuration] = useState(30); // Default 30 seconds for free users
  const [transcript, setTranscript] = useState<string>("");
  const [processedContent, setProcessedContent] = useState<string>("");
  const [socialContent, setSocialContent] = useState<SocialMediaContent | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [processingStage, setProcessingStage] = useState<'idle' | 'recorded' | 'transcribing' | 'formatting' | 'complete'>('idle');
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Check if premium is enabled via environment variable
  const isPremiumEnabled = import.meta.env.VITE_PREMIUM_ENABLED === 'true';

  const transcriptionMutation = useMutation({
    mutationFn: async (audioBlob: Blob): Promise<TranscriptionResponse> => {
      try {
        const formData = new FormData();
        const recordingFormat = (audioBlob as any).recordingFormat || { fileExtension: 'webm' };
        const filename = `recording.${recordingFormat.fileExtension}`;

        console.log('Uploading audio:');
        console.log('- Filename:', filename);
        console.log('- Blob type:', audioBlob.type);
        console.log('- Blob size:', audioBlob.size);

        formData.append('audio', audioBlob, filename);

        const response = await apiRequest('POST', '/api/transcribe', formData);
        const data = await response.json();

        // Handle API error responses
        if (!response.ok) {
          throw new Error(JSON.stringify(data));
        }

        return data;
      } catch (error: any) {
        // Re-throw to be caught by onError
        throw error;
      }
    },
    onSuccess: (data) => {
      setProcessingStage('complete');
      setTranscript(data.transcript);
      setProcessedContent(data.processedContent);
      setShowResultsModal(true);

      // Invalidate queries if user is authenticated  
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/user/recordings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      }

      toast({
        title: "Recording processed successfully!",
        description: "Your voice has been transcribed and enhanced.",
      });
    },
    onError: (error: any) => {
      console.error('Transcription error:', error);
      setProcessingStage('recorded'); // Return to recorded state so user can try again

      let errorTitle = "Processing failed";
      let errorDescription = "Failed to process your recording. Please try again.";

      try {
        // Try to parse structured error response
        const errorData: ApiError = JSON.parse(error.message);

        switch (errorData.type) {
          case 'UPLOAD_ERROR':
            errorTitle = "Audio Upload Failed";
            errorDescription = errorData.message || "Could not upload your recording. Please try again.";
            break;

          case 'WHISPER_ERROR':
            errorTitle = "Speech Recognition Failed";
            errorDescription = errorData.message || "Could not understand your speech. Please speak more clearly and try again.";
            break;

          case 'GPT_ERROR':
            errorTitle = "Content Processing Failed";
            errorDescription = errorData.message || "Could not enhance your content, but transcription may still work.";
            break;

          case 'SERVER_ERROR':
            errorTitle = "Server Error";
            errorDescription = errorData.message || "A server error occurred. Please try again later.";
            break;

          default:
            errorTitle = errorData.error || "Processing failed";
            errorDescription = errorData.message || "An unexpected error occurred. Please try again.";
        }
      } catch (parseError) {
        // Fallback to generic error handling
        if (error.message) {
          errorDescription = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    }
  });

  // Social media content generation mutation
  const socialMediaMutation = useMutation({
    mutationFn: async (content: string): Promise<SocialMediaResponse> => {
      const response = await apiRequest('POST', '/api/generate-social-content', {
        processedContent: content
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      return data;
    },
    onSuccess: (data) => {
      setSocialContent(data.socialContent);
      toast({
        title: "Social media content generated!",
        description: "Your content has been optimized for different platforms.",
      });
    },
    onError: (error: any) => {
      console.error('Social media generation error:', error);

      let errorTitle = "Social media generation failed";
      let errorDescription = "Could not generate social media content. Please try again.";

      try {
        const errorData: ApiError = JSON.parse(error.message);

        switch (errorData.type) {
          case 'SOCIAL_MEDIA_ERROR':
            errorTitle = "Social Media Generation Failed";
            errorDescription = errorData.message || "Could not generate platform-specific content.";
            break;
          case 'VALIDATION_ERROR':
            errorTitle = "Invalid Content";
            errorDescription = errorData.message || "Please ensure you have processed content first.";
            break;
          default:
            errorTitle = errorData.error || "Generation failed";
            errorDescription = errorData.message || "An unexpected error occurred.";
        }
      } catch (parseError) {
        if (error.message) {
          errorDescription = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    }
  });

  const initializeRecording = useCallback(async () => {
    try {
      setMicrophoneError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Force webm format for maximum Whisper compatibility
      // MediaRecorder's mp4/wav variants often have codec issues with OpenAI
      let mimeType = 'audio/webm;codecs=opus';
      let fileExtension = 'webm';

      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
        fileExtension = 'webm';
      } else {
        // Fallback - but log the issue
        console.warn('WebM not supported, using fallback format');
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
          fileExtension = 'mp4';
        }
      }

      console.log('Using audio format:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      // Store the format info for later use
      (mediaRecorder as any).recordingFormat = { mimeType, fileExtension };

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);

        // Use the correct MIME type that was actually recorded
        const recordingFormat = (mediaRecorder as any).recordingFormat;
        const blob = new Blob(audioChunksRef.current, { type: recordingFormat.mimeType });

        console.log('Audio blob created:');
        console.log('- Size:', blob.size, 'bytes');
        console.log('- Type:', blob.type);
        console.log('- Format:', recordingFormat);

        // Store format info with the blob
        (blob as any).recordingFormat = recordingFormat;
        setAudioBlob(blob);
        setProcessingStage('recorded');

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      return true;
    } catch (error: any) {
      console.error('Error accessing microphone:', error);

      let errorMessage = "Please enable microphone permissions and try again.";

      if (error.name === 'NotAllowedError') {
        errorMessage = "Microphone access was denied. Please allow microphone access in your browser settings and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No microphone found. Please connect a microphone and try again.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Microphone is already in use by another application. Please close other apps using the microphone and try again.";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Microphone constraints could not be satisfied. Please try again.";
      }

      setMicrophoneError(errorMessage);
      toast({
        title: "Microphone Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [transcriptionMutation, toast]);

  const startRecording = useCallback(async () => {
    const initialized = await initializeRecording();
    if (!initialized || !mediaRecorderRef.current) return;

    setIsRecording(true);
    setRecordingTime(0);
    setTranscript("");
    setProcessedContent("");
    setAudioBlob(null);
    setProcessingStage('idle');
    setShowResultsModal(false);

    mediaRecorderRef.current.start(1000); // Collect data every second

    // Start timer with auto-stop at 30 seconds
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        if (newTime >= maxDuration) {
          // Auto-stop at 30 seconds
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          setIsRecording(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // Show upgrade prompt for free users who hit the limit
          if (maxDuration === 30 && isAuthenticated) {
            toast({
              title: "Recording Limit Reached",
              description: "Upgrade to record longer audio clips with premium plans!",
              action: (
                <Button 
                  onClick={() => setShowPremiumModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Upgrade
                </Button>
              ),
            });
          }
        }
        return newTime;
      });
    }, 1000);
  }, [initializeRecording, maxDuration]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    setIsRecording(false);
    mediaRecorderRef.current.stop();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    setTranscript("");
    setProcessedContent("");
    setSocialContent(null);
    setRecordingTime(0);
    setProcessingStage('idle');
    setMicrophoneError(null);
    setAudioBlob(null);
    setShowResultsModal(false);
  }, []);

  const processRecording = useCallback(() => {
    if (!audioBlob) {
      console.error('No audio blob available');
      toast({
        title: "No Recording Found",
        description: "Please record audio first before converting to text.",
        variant: "destructive",
      });
      return;
    }

    console.log('Processing audio blob, size:', audioBlob.size);
    setProcessingStage('transcribing');

    // Simulate processing stages
    setTimeout(() => {
      setProcessingStage('formatting');
    }, 1000);

    transcriptionMutation.mutate(audioBlob);
  }, [audioBlob, transcriptionMutation, toast]);

  const generateSocialContent = useCallback(() => {
    if (!processedContent) {
      toast({
        title: "No content to process",
        description: "Please process your recording first before generating social media content.",
        variant: "destructive",
      });
      return;
    }

    socialMediaMutation.mutate(processedContent);
  }, [processedContent, socialMediaMutation, toast]);

  const copyToClipboard = useCallback(async (text: string, platform?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard!",
        description: platform 
          ? `${platform} content has been copied to your clipboard.`
          : "Text has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try copying the text manually.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const progressPercent = (recordingTime / maxDuration) * 100;
  const isProcessing = transcriptionMutation.isPending;

  // Mock user plan data for UI testing - will be replaced with real data from plan status API
  const mockMinutesRemaining = 5; // Simulate low minutes for testing
  const isLowOnMinutes = mockMinutesRemaining <= 10;

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-lg p-4 sm:p-8 border border-gray-200">
      {/* Usage Warning Banner */}
      {isAuthenticated && isLowOnMinutes && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Low on Minutes: {mockMinutesRemaining} minutes remaining
                </p>
                <p className="text-xs text-yellow-700">
                  Upgrade to get unlimited recording time
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowPremiumModal(true)}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              data-testid="button-upgrade-low-minutes"
            >
              <Crown className="w-3 h-3 mr-1" />
              Upgrade
            </Button>
          </div>
        </div>
      )}
      
      <div className="text-center">
        <div className="relative inline-block">
          <Button
            size="lg"
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full p-0 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              isRecording 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isRecording ? (
              <Square className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            )}
          </Button>

          {isRecording && (
            <div className="absolute inset-0 rounded-full bg-red-600 opacity-75 animate-ping"></div>
          )}
        </div>

        <p className="mt-4 text-gray-600">
          {processingStage === 'transcribing'
            ? "Transcribing your speech..."
            : processingStage === 'formatting'
            ? "Enhancing content with AI..."
            : processingStage === 'complete'
            ? (!isAuthenticated 
                ? "Great! Now unlock social media generation with our premium features!" 
                : "Processing complete!")
            : processingStage === 'recorded'
            ? "Recording saved! Click 'Convert to Text' to process."
            : isRecording 
              ? "Recording... Click to stop" 
              : microphoneError
              ? "Microphone error - click to try again"
              : "Click to start recording (30s max)"
          }
        </p>

        {microphoneError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{microphoneError}</p>
          </div>
        )}

        {processingStage !== 'idle' && processingStage !== 'complete' && (
          <div className="mt-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="mt-2 w-full">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-sm text-gray-500 mt-1">{recordingTime}s / {maxDuration}s</p>
          </div>
        )}
      </div>

      {/* Recording Length Slider */}
      {!isRecording && processingStage === 'idle' && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Recording Length</label>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{maxDuration}s</span>
              {maxDuration > 30 && !isPremiumEnabled && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Star className="w-4 h-4 text-blue-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Premium — coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Slider
              value={[maxDuration]}
              onValueChange={(value) => {
                const newDuration = value[0];
                if (newDuration > 30 && !isPremiumEnabled) {
                  setShowPremiumModal(true);
                  return;
                }
                setMaxDuration(newDuration);
              }}
              max={300}
              min={5}
              step={5}
              className="w-full"
              data-testid="slider-recording-length"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>5s</span>
              <span>30s (Free)</span>
              <span>5min (Premium)</span>
            </div>
          </div>
        </div>
      )}

      {processingStage === 'recorded' && (
        <div className="mt-6 space-y-3">
          <Button 
            onClick={processRecording}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
            disabled={!audioBlob}
          >
            Convert to Text
          </Button>
          <Button 
            onClick={resetRecording}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Record Again
          </Button>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && (transcript || processedContent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Your Content Results</h2>
                <button 
                  onClick={() => setShowResultsModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  data-testid="button-close-modal"
                >
                  ×
                </button>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                  <TabsTrigger 
                    value="basic" 
                    data-testid="tab-basic-content"
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600"
                  >
                    Basic Content
                  </TabsTrigger>
                  <TabsTrigger 
                    value="social" 
                    data-testid="tab-social-content"
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600"
                  >
                    Generate Social media content
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-6">
                  {transcript && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-800 mb-2">Original Transcript:</label>
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <p className="text-gray-800 whitespace-pre-wrap">{transcript}</p>
                      </div>
                    </div>
                  )}

                  {processedContent && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-800 mb-2">AI-Enhanced Content:</label>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-gray-800 whitespace-pre-wrap">{processedContent}</p>
                      </div>
                      <Button 
                        onClick={() => copyToClipboard(processedContent)}
                        variant="outline"
                        className="mt-3"
                        data-testid="button-copy-enhanced"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Enhanced Content
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="social" className="mt-6">
                  {!isAuthenticated ? (
                    <div className="text-center py-12">
                      <Sparkles className="w-16 h-16 text-blue-600 mx-auto mb-6" />
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Generate Social Media Content</h3>
                      <p className="text-gray-600 mb-8 max-w-md mx-auto">
                        Generate optimized content for your social media profiles - Facebook, Instagram, YouTube and much more! Get voice history, unlimited voice conversion, saved data and advanced features.
                      </p>

                      <Button 
                        onClick={() => setShowAuthModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg font-semibold"
                        data-testid="button-login-for-social"
                      >
                        <LogIn className="w-5 h-5 mr-2" />
                        Sign Up to Unlock
                      </Button>
                    </div>
                  ) : !socialContent ? (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Generate Social Media Content</h3>
                      <p className="text-gray-600 mb-6">Transform your content into platform-optimized posts for Instagram, Facebook, and YouTube.</p>

                      <Button 
                        onClick={generateSocialContent}
                        disabled={socialMediaMutation.isPending || !processedContent}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-generate-social"
                      >
                        {socialMediaMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Social Media Content
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Instagram Content */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <Instagram className="w-5 h-5 text-pink-600 mr-2" />
                          <h4 className="font-semibold text-gray-800">Instagram</h4>
                        </div>
                        <div className="bg-pink-50 rounded-lg p-4 border border-pink-200 mb-3">
                          <p className="text-gray-800 whitespace-pre-wrap">{socialContent.instagram}</p>
                        </div>
                        <Button 
                          onClick={() => copyToClipboard(socialContent.instagram, "Instagram")}
                          variant="outline"
                          size="sm"
                          data-testid="button-copy-instagram"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Instagram Post
                        </Button>
                      </div>

                      {/* Facebook Content */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <Facebook className="w-5 h-5 text-blue-600 mr-2" />
                          <h4 className="font-semibold text-gray-800">Facebook</h4>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-3">
                          <p className="text-gray-800 whitespace-pre-wrap">{socialContent.facebook}</p>
                        </div>
                        <Button 
                          onClick={() => copyToClipboard(socialContent.facebook, "Facebook")}
                          variant="outline"
                          size="sm"
                          data-testid="button-copy-facebook"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Facebook Post
                        </Button>
                      </div>

                      {/* YouTube Content */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <Youtube className="w-5 h-5 text-red-600 mr-2" />
                          <h4 className="font-semibold text-gray-800">YouTube</h4>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200 mb-3">
                          <p className="text-gray-800 whitespace-pre-wrap">{socialContent.youtube}</p>
                        </div>
                        <Button 
                          onClick={() => copyToClipboard(socialContent.youtube, "YouTube")}
                          variant="outline"
                          size="sm"
                          data-testid="button-copy-youtube"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy YouTube Description
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-6 border-t">
                <Button 
                  onClick={() => setShowResultsModal(false)}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-close"
                >
                  Close
                </Button>
                {!isAuthenticated ? (
                  <Button 
                    onClick={() => setShowAuthModal(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    data-testid="button-generate-social-media"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Social Media
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      resetRecording();
                      setShowResultsModal(false);
                    }}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-new-recording"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    New Recording
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
      />

      <PremiumModal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </div>
  );
}