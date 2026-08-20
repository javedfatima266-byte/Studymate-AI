import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  Upload, 
  ChevronDown, 
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { PermissionService } from '../services/permissionService';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, fileName?: string) => void;
  onFallbackToFileUpload?: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFileUpload,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(false);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize or switch camera
  const startCamera = async (facing: 'user' | 'environment') => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsPermissionDenied(false);

    // Stop existing stream first
    if (stream) {
      PermissionService.stopStream(stream);
      setStream(null);
    }

    const res = await PermissionService.requestCameraStream(facing);
    setIsLoading(false);

    if (res.stream) {
      setStream(res.stream);
      if (videoRef.current) {
        videoRef.current.srcObject = res.stream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    } else {
      setErrorMessage(res.error || 'Unable to start camera.');
      setIsPermissionDenied(res.isDenied);
    }
  };

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      startCamera(facingMode);
    } else {
      // Cleanup stream when closed
      if (stream) {
        PermissionService.stopStream(stream);
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        PermissionService.stopStream(stream);
      }
    };
  }, [isOpen, facingMode]);

  // Make sure video srcObject stays attached if re-rendered
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn('Video play error:', e));
    }
  }, [stream]);

  // Switch facing mode (Front / Back)
  const handleToggleFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  // Capture frame from video to canvas
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual shutter flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);

    const canvas = canvasRef.current || document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, flip horizontally for natural mirror look
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPreview(dataUrl);
  };

  // Confirm captured photo
  const handleConfirmPhoto = () => {
    if (capturedPreview) {
      // Stop camera cleanly
      if (stream) {
        PermissionService.stopStream(stream);
        setStream(null);
      }
      onCapture(capturedPreview, `study_capture_${Date.now()}.jpg`);
      onClose();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPreview(null);
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn(e));
    } else {
      startCamera(facingMode);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    if (stream) {
      PermissionService.stopStream(stream);
      setStream(null);
    }
    setCapturedPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  const permissionHelp = PermissionService.getPermissionInstructions('camera');

  return (
    <div 
      id="modal-camera-capture"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div 
        className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Study Camera</h3>
              <p className="text-[11px] text-slate-400">Snap textbook pages, formulas, or study notes</p>
            </div>
          </div>
          <button
            id="btn-close-camera"
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview / Error Area */}
        <div className="relative bg-black flex-1 min-h-[320px] sm:min-h-[400px] flex items-center justify-center overflow-hidden">
          {/* Shutter Flash effect */}
          {isShutterFlashing && (
            <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
          )}

          {/* Hidden Canvas for Frame Grab */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Case 1: Captured Preview */}
          {capturedPreview ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-3">
              <img 
                src={capturedPreview} 
                alt="Captured study material" 
                className="max-h-[360px] sm:max-h-[420px] w-auto object-contain rounded-xl shadow-lg border border-slate-700" 
              />
              <div className="absolute bottom-4 flex items-center gap-3">
                <button
                  id="btn-retake-photo"
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-600 shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Retake
                </button>
                <button
                  id="btn-confirm-photo"
                  type="button"
                  onClick={handleConfirmPhoto}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Use Photo in Chat
                </button>
              </div>
            </div>
          ) : isPermissionDenied || errorMessage ? (
            /* Case 2: Permission Denied or Camera Error */
            <div className="p-6 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-100 mb-1">
                  {isPermissionDenied ? 'Camera Permission Required' : 'Camera Unavailable'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {errorMessage || 'StudyMate AI needs camera access to capture textbook pages and study notes.'}
                </p>
              </div>

              {/* Expandable Browser Settings Help */}
              {isPermissionDenied && (
                <div className="bg-slate-800/90 rounded-xl border border-slate-700 text-left overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowHelpGuide(!showHelpGuide)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-bold text-indigo-400 hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      How to allow Camera in your browser
                    </span>
                    {showHelpGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showHelpGuide && (
                    <div className="px-3 pb-3 pt-1 space-y-3 text-[11px] text-slate-300 border-t border-slate-700/60">
                      {permissionHelp.map((guide, idx) => (
                        <div key={idx} className="space-y-1">
                          <span className="font-bold text-slate-200">{guide.browser}:</span>
                          <ol className="list-decimal list-inside space-y-0.5 text-slate-400 pl-1">
                            {guide.steps.map((st, sIdx) => (
                              <li key={sIdx}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  id="btn-retry-camera"
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
                {onFallbackToFileUpload && (
                  <button
                    id="btn-fallback-upload"
                    type="button"
                    onClick={() => {
                      handleCloseModal();
                      onFallbackToFileUpload();
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload from Files Instead
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : (
            /* Case 3: Live Video Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 gap-2">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Opening camera stream...</p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder Target Framing Guidelines */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-white/40 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-2 border-l-2 border-indigo-400" />
                  <div className="w-5 h-5 border-t-2 border-r-2 border-indigo-400" />
                </div>
                <div className="text-center">
                  <span className="bg-black/60 backdrop-blur-xs text-[10px] text-slate-200 px-3 py-1 rounded-full font-medium shadow-xs">
                    Align text or diagram within frame
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-2 border-l-2 border-indigo-400" />
                  <div className="w-5 h-5 border-b-2 border-r-2 border-indigo-400" />
                </div>
              </div>

              {/* Camera Controls Floating Bottom Bar */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 px-4 z-30">
                {/* Switch Camera / Facing */}
                <button
                  id="btn-switch-camera"
                  type="button"
                  onClick={handleToggleFacing}
                  className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center border border-slate-600/80 backdrop-blur-xs transition-colors cursor-pointer shadow-md"
                  title="Switch camera (Front / Back)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Shutter Capture Button */}
                <button
                  id="btn-shutter-snap"
                  type="button"
                  onClick={handleSnapPhoto}
                  className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shadow-xl shadow-black/40 ring-4 ring-white/30 active:scale-95 transition-transform cursor-pointer"
                  title="Take photo"
                >
                  <div className="w-13 h-13 rounded-full border-2 border-slate-900 flex items-center justify-center bg-white">
                    <Camera className="w-6 h-6 text-slate-900" />
                  </div>
                </button>

                {/* Fallback to file gallery */}
                {onFallbackToFileUpload && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseModal();
                      onFallbackToFileUpload();
                    }}
                    className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center border border-slate-600/80 backdrop-blur-xs transition-colors cursor-pointer shadow-md"
                    title="Upload image from files instead"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
