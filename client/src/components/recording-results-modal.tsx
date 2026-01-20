import { useState } from "react";
import { Copy, Check, X, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import AuthModal from "./auth-modal";

interface RecordingResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: string;
  processedContent: string;
  isAuthenticated: boolean;
}

export default function RecordingResultsModal({
  isOpen,
  onClose,
  transcript,
  processedContent,
  isAuthenticated
}: RecordingResultsModalProps) {
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, type: 'transcript' | 'content') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'transcript') {
        setCopiedTranscript(true);
        setTimeout(() => setCopiedTranscript(false), 2000);
      } else {
        setCopiedContent(true);
        setTimeout(() => setCopiedContent(false), 2000);
      }

      toast({
        title: "Copied to clipboard",
        description: `${type === 'transcript' ? 'Transcript' : 'Enhanced content'} copied successfully.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignUpClick = () => {
    console.log('Sign up button clicked from recording results modal');
    console.log('Current showAuthModal state:', showAuthModal);
    // Track signup click from recording results
    trackEvent('sign_up_click', 'recording_results', 'unlock_features');
    setShowAuthModal(true);
    console.log('Setting showAuthModal to true');
  };

  return (
    <>
      {!showAuthModal && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto z-[60]">
            <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">Your Content is Ready!</DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Results */}
            <div className="space-y-6">
              {/* Transcript */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Original Transcript</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(transcript, 'transcript')}
                      className="flex items-center space-x-1"
                    >
                      {copiedTranscript ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span>{copiedTranscript ? 'Copied!' : 'Copy'}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                    {transcript}
                  </p>
                </CardContent>
              </Card>

              {/* Enhanced Content */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
                      Enhanced Content
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(processedContent, 'content')}
                      className="flex items-center space-x-1"
                    >
                      {copiedContent ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span>{copiedContent ? 'Copied!' : 'Copy'}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-700 text-sm leading-relaxed bg-blue-50 p-4 rounded-lg whitespace-pre-wrap">
                    {processedContent}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Social Media or Auth */}
            <div className="space-y-6">
              {isAuthenticated ? (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-700 flex items-center">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Welcome Back!
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-purple-600 text-sm leading-relaxed">
                      Thanks for signing up! Transform your content into social media posts in your dashboard.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-700 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Unlock More Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-blue-600">
                        <Check className="h-4 w-4 mr-2" />
                        <span>Generate social media content</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-600">
                        <Check className="h-4 w-4 mr-2" />
                        <span>Platform-specific formatting</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-600">
                        <Check className="h-4 w-4 mr-2" />
                        <span>Save and organize your content</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-600">
                        <Check className="h-4 w-4 mr-2" />
                        <span>Access content history</span>
                      </div>
                    </div>

                    <Separator />

                    <Button 
                      onClick={handleSignUpClick}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Sign Up Free
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
          </Dialog>
        )}

        {showAuthModal && (
          <div className="fixed inset-0 z-[60]">
            <div className="max-w-6xl max-h-[90vh] overflow-y-auto mx-auto mt-[5vh] bg-white rounded-lg shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold">Your Content is Ready!</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAuthModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                {/* Left Column - Results */}
                <div className="space-y-6">
                  {/* Transcript */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Original Transcript</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(transcript, 'transcript')}
                          className="flex items-center space-x-1"
                        >
                          {copiedTranscript ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span>{copiedTranscript ? 'Copied!' : 'Copy'}</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                        {transcript}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Enhanced Content */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center">
                          <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
                          Enhanced Content
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(processedContent, 'content')}
                          className="flex items-center space-x-1"
                        >
                          {copiedContent ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span>{copiedContent ? 'Copied!' : 'Copy'}</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-gray-700 text-sm leading-relaxed bg-blue-50 p-4 rounded-lg whitespace-pre-wrap">
                        {processedContent}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Social Media or Auth */}
                <div className="space-y-6">
                  {isAuthenticated ? (
                    <Card className="border-purple-200 bg-purple-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-700 flex items-center">
                          <Sparkles className="h-5 w-5 mr-2" />
                          Welcome Back!
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-purple-600 text-sm leading-relaxed">
                          Thanks for signing up! Transform your content into social media posts in your dashboard.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-700 flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Unlock More Features
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center text-sm text-blue-600">
                            <Check className="h-4 w-4 mr-2" />
                            <span>Generate social media content</span>
                          </div>
                          <div className="flex items-center text-sm text-blue-600">
                            <Check className="h-4 w-4 mr-2" />
                            <span>Platform-specific formatting</span>
                          </div>
                          <div className="flex items-center text-sm text-blue-600">
                            <Check className="h-4 w-4 mr-2" />
                            <span>Save and organize your content</span>
                          </div>
                          <div className="flex items-center text-sm text-blue-600">
                            <Check className="h-4 w-4 mr-2" />
                            <span>Access content history</span>
                          </div>
                        </div>

                        <Separator />

                        <Button 
                          onClick={handleSignUpClick}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Sign Up Free
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Modal - render with higher z-index and signup mode */}
        {showAuthModal && (
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => {
              console.log('Closing auth modal from results modal');
              setShowAuthModal(false);
            }}
            initialMode="signup"
            zIndex="z-[70]"
          />
        )}
    </>
  );
}