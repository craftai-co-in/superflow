import { useState, useRef, useCallback } from "react";
import { Mic, Square, Copy, RotateCcw, Sparkles, Instagram, Facebook, Youtube, Loader2, Clock, Crown, Upload, Users, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";
import type { SocialMediaContent, PremiumTranscriptionResponse, FileUploadRequest } from "@shared/schema";

interface ApiError {
  error: string;
  message: string;
  type: string;
  details?: string;
}

export default function PremiumRecordingInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState<string>("");
  const [processedContent, setProcessedContent] = useState<string>("");
  const [socialContent, setSocialContent] = useState<SocialMediaContent | null>(null);
  const [speakerSegments, setSpeakerSegments] = useState<any[]>([]);
  
  // Premium features state
  const [enableSpeakerDetection, setEnableSpeakerDetection] = useState(false);
  const [enableTimestamps, setEnableTimestamps] = useState(false);
  const [transcriptionQuality, setTranscriptionQuality] = useState<'standard' | 'high' | 'premium'>('high');
  const [processingPriority, setProcessingPriority] = useState<'normal' | 'high' | 'priority'>('high');
  
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [processingStage, setProcessingStage] = useState<'idle' | 'recorded' | 'transcribing' | 'formatting' | 'complete'>('idle');
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Premium transcription mutation with enhanced features
  const transcriptionMutation = useMutation({
    mutationFn: async (audioData: Blob | File) => {
      const formData = new FormData();
      formData.append('audio', audioData);
      
      // Add premium options
      formData.append('enableSpeakerDetection', enableSpeakerDetection.toString());
      formData.append('enableTimestamps', enableTimestamps.toString());
      formData.append('transcriptionQuality', transcriptionQuality);
      formData.append('processingPriority', processingPriority);
      
      const response = await apiRequest('POST', '/api/premium/transcribe', formData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Premium transcription failed');
      }
      return response.json();
    },
    onSuccess: (data: PremiumTranscriptionResponse) => {
      setTranscript(data.transcript);
      setProcessedContent(data.processedContent);
      
      if (data.speakerSegments) {
        setSpeakerSegments(data.speakerSegments);
      }
      
      setProcessingStage('complete');
      setShowResultsModal(true);
      
      // Track premium feature usage
      trackEvent('premium_transcription_complete', 'premium', transcriptionQuality);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/recordings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
      
      toast({
        title: "Premium Transcription Complete!",
        description: `Enhanced processing completed with ${data.quality} quality.`,
      });
    },
    onError: (error: any) => {
      console.error('Premium transcription error:', error);
      setProcessingStage('idle');
      
      const errorMessage = error.message || 'Premium transcription failed';
      toast({
        title: "Premium Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Social media generation mutation (unchanged)
  const socialMediaMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/generate-social-content', { content });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Social media generation failed');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      setSocialContent(data.socialContent);
      trackEvent('social_content_generated', 'premium', 'success');
      
      toast({
        title: "Social Content Generated!",
        description: "Your content has been optimized for all platforms.",
      });
    },
    onError: (error: any) => {
      console.error('Social media generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate social media content.",
        variant: "destructive",
      });
    },
  });

  // File upload handlers
  const handleFileUpload = useCallback((file: File) => {
    // Validate file type
    const supportedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/ogg'];
    if (!supportedTypes.includes(file.type)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload an audio file (.mp3, .wav, .m4a, .ogg)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 100MB for premium)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload files smaller than 100MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setAudioBlob(file);
    setProcessingStage('recorded');
    
    toast({
      title: "File Uploaded!",
      description: `${file.name} is ready for premium processing.`,
    });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Recording functions (unlimited duration)
  const initializeRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        } 
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setProcessingStage('recorded');
        stream.getTracks().forEach(track => track.stop());
      };

      setMicrophoneError(null);
      return true;
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      setMicrophoneError(`Microphone access denied: ${error.message}`);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    const initialized = await initializeRecording();
    if (!initialized || !mediaRecorderRef.current) return;

    setIsRecording(true);
    setRecordingTime(0);
    setProcessingStage('idle');
    
    mediaRecorderRef.current.start();

    // No time limit for premium users - unlimited recording
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);

    trackEvent('premium_recording_started', 'premium', 'unlimited');
  }, [initializeRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    setIsRecording(false);
    mediaRecorderRef.current.stop();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    trackEvent('premium_recording_stopped', 'premium', recordingTime.toString());
  }, [isRecording, recordingTime]);

  const resetRecording = useCallback(() => {
    setTranscript("");
    setProcessedContent("");
    setSocialContent(null);
    setSpeakerSegments([]);
    setRecordingTime(0);
    setProcessingStage('idle');
    setMicrophoneError(null);
    setAudioBlob(null);
    setUploadedFile(null);
    setShowResultsModal(false);
  }, []);

  const processRecording = useCallback(() => {
    if (!audioBlob && !uploadedFile) {
      toast({
        title: "No Audio Available",
        description: "Please record audio or upload a file before processing.",
        variant: "destructive",
      });
      return;
    }

    setProcessingStage('transcribing');
    
    // Use uploaded file or recorded blob
    const audioData = uploadedFile || audioBlob!;
    transcriptionMutation.mutate(audioData);
  }, [audioBlob, uploadedFile, transcriptionMutation, toast]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-lg p-4 sm:p-8 border border-gray-200">
      {/* Premium Badge */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
          <Crown className="w-4 h-4" />
          <span>Premium Features Enabled</span>
        </div>
      </div>

      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="voice" className="flex items-center space-x-2">
            <Mic className="w-4 h-4" />
            <span>Voice Recording</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>File Upload</span>
          </TabsTrigger>
        </TabsList>

        {/* Voice Recording Tab */}
        <TabsContent value="voice" className="space-y-6">
          {/* Premium Recording Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Transcription Quality</Label>
              <Select value={transcriptionQuality} onValueChange={(value: any) => setTranscriptionQuality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Quality</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                  <SelectItem value="premium">Premium Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Processing Priority</Label>
              <Select value={processingPriority} onValueChange={(value: any) => setProcessingPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="priority">Priority Queue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Speaker Detection</span>
              </Label>
              <Switch 
                checked={enableSpeakerDetection} 
                onCheckedChange={setEnableSpeakerDetection}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Timestamps</span>
              </Label>
              <Switch 
                checked={enableTimestamps} 
                onCheckedChange={setEnableTimestamps}
              />
            </div>
          </div>

          {/* Unlimited Recording Interface */}
          <div className="text-center">
            <div className="relative inline-block">
              <Button
                size="lg"
                className={`w-24 h-24 rounded-full p-0 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  isRecording 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                }`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={transcriptionMutation.isPending}
                data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </Button>

              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-red-600 opacity-75 animate-ping"></div>
              )}
            </div>

            <p className="mt-4 text-gray-600">
              {processingStage === 'transcribing'
                ? "Premium transcription in progress..."
                : processingStage === 'formatting'
                ? "Enhancing content with advanced AI..."
                : processingStage === 'complete'
                ? "Premium processing complete!"
                : processingStage === 'recorded'
                ? "Audio ready! Click 'Process with Premium AI' to continue."
                : isRecording 
                  ? `Recording... ${formatTime(recordingTime)} (unlimited)` 
                  : microphoneError
                  ? "Microphone error - click to try again"
                  : "Click to start unlimited recording"
              }
            </p>

            {isRecording && (
              <div className="mt-4 space-y-2">
                <div className="text-2xl font-mono font-bold text-purple-600">
                  {formatTime(recordingTime)}
                </div>
                <p className="text-sm text-gray-500">Unlimited recording time</p>
              </div>
            )}

            {microphoneError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{microphoneError}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* File Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="space-y-4">
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <FileAudio className="w-6 h-6 text-gray-600" />
                </div>
                
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Drop audio files here
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Support for .mp3, .wav, .m4a, .ogg files up to 100MB
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    id="audio-file-input"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="audio-file-input" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </label>
                  </Button>
                </div>
              </div>
            </div>

            {/* Uploaded File Info */}
            {uploadedFile && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileAudio className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">{uploadedFile.name}</p>
                      <p className="text-sm text-blue-600">
                        {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setUploadedFile(null);
                      setAudioBlob(null);
                      setProcessingStage('idle');
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Process Button */}
      {(audioBlob || uploadedFile) && processingStage === 'recorded' && (
        <div className="mt-6 text-center">
          <Button
            onClick={processRecording}
            disabled={transcriptionMutation.isPending}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            data-testid="button-process-premium"
          >
            {transcriptionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Premium Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Process with Premium AI
              </>
            )}
          </Button>
        </div>
      )}

      {/* Processing Animation */}
      {processingStage !== 'idle' && processingStage !== 'complete' && processingStage !== 'recorded' && (
        <div className="mt-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}

      {/* Enhanced Results with Speaker Detection */}
      {transcript && processingStage === 'complete' && (
        <div className="mt-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
              Premium Transcription Results
            </h3>
            
            {/* Speaker Segments (if enabled) */}
            {enableSpeakerDetection && speakerSegments.length > 0 && (
              <div className="mb-4 space-y-2">
                <Label className="text-sm font-medium">Speaker Segments:</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {speakerSegments.map((segment, index) => (
                    <div key={index} className="text-sm p-2 bg-white rounded border">
                      <span className="font-medium text-purple-600">{segment.speaker}:</span>
                      <span className="ml-2">{segment.text}</span>
                      {enableTimestamps && (
                        <span className="text-xs text-gray-500 ml-2">
                          [{formatTime(segment.startTime)} - {formatTime(segment.endTime)}]
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Enhanced Content:</Label>
              <div className="bg-white p-3 border rounded text-sm whitespace-pre-wrap">
                {processedContent}
              </div>
              <Button
                onClick={() => copyToClipboard(processedContent, "Enhanced Content")}
                size="sm"
                variant="outline"
                data-testid="button-copy-enhanced"
              >
                <Copy className="w-3 h-3 mr-2" />
                Copy Enhanced Content
              </Button>
            </div>
          </div>

          {/* Social Media Generation */}
          <div className="flex justify-center">
            <Button
              onClick={generateSocialContent}
              disabled={socialMediaMutation.isPending}
              className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
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
        </div>
      )}

      {/* Social Media Results */}
      {socialContent && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instagram */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Instagram className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Instagram</span>
                </div>
                <Button
                  onClick={() => copyToClipboard(`${socialContent.instagram.caption}\n\n${socialContent.instagram.hashtags.join(' ')}`, "Instagram")}
                  size="sm"
                  variant="ghost"
                  data-testid="button-copy-instagram"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-sm space-y-2">
                <p>{socialContent.instagram.caption}</p>
                <p className="text-purple-600">{socialContent.instagram.hashtags.join(' ')}</p>
              </div>
            </div>

            {/* Twitter */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="font-medium">X/Twitter</span>
                </div>
                <Button
                  onClick={() => copyToClipboard(socialContent.twitter.thread.join('\n\n'), "Twitter")}
                  size="sm"
                  variant="ghost"
                  data-testid="button-copy-twitter"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-sm space-y-2">
                {socialContent.twitter.thread.map((tweet, index) => (
                  <p key={index} className="p-2 bg-white rounded border">
                    {index + 1}. {tweet}
                  </p>
                ))}
              </div>
            </div>

            {/* YouTube */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Youtube className="w-5 h-5 text-red-600" />
                  <span className="font-medium">YouTube</span>
                </div>
                <Button
                  onClick={() => copyToClipboard(`${socialContent.youtube.title}\n\n${socialContent.youtube.description}\n\nTags: ${socialContent.youtube.tags.join(', ')}`, "YouTube")}
                  size="sm"
                  variant="ghost"
                  data-testid="button-copy-youtube"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-sm space-y-2">
                <p className="font-medium">{socialContent.youtube.title}</p>
                <p className="text-gray-600">{socialContent.youtube.description}</p>
                <p className="text-red-600">{socialContent.youtube.tags.join(', ')}</p>
              </div>
            </div>

            {/* Facebook */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Facebook className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Facebook</span>
                </div>
                <Button
                  onClick={() => copyToClipboard(socialContent.facebook.post, "Facebook")}
                  size="sm"
                  variant="ghost"
                  data-testid="button-copy-facebook"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-sm">
                <p>{socialContent.facebook.post}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {transcript && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={resetRecording}
            variant="outline"
            className="flex items-center space-x-2"
            data-testid="button-reset-premium"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Recording</span>
          </Button>
        </div>
      )}
    </div>
  );
}