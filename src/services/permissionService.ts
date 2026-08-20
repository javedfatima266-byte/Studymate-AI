/**
 * StudyMate AI - Permission Service
 * Handles browser Camera and Microphone permissions with robust error handling,
 * state querying, and helpful user guidance for permission management.
 */

export type PermissionType = 'camera' | 'microphone';
export type PermissionStateResult = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface PermissionHelpStep {
  browser: string;
  steps: string[];
}

export class PermissionService {
  /**
   * Check current permission status via navigator.permissions if supported
   */
  public static async queryPermission(type: PermissionType): Promise<PermissionStateResult> {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const queryName = type as any;
        const status = await navigator.permissions.query({ name: queryName });
        return (status.state as PermissionStateResult) || 'prompt';
      }
    } catch {
      // Some browsers (e.g. Safari or older engines) may throw on 'camera' or 'microphone' in permissions.query
    }
    return 'unsupported';
  }

  /**
   * Request Camera permission and acquire video stream ONLY.
   * Never requests audio when accessing the camera.
   */
  public static async requestCameraStream(
    facingMode: 'user' | 'environment' = 'environment'
  ): Promise<{ stream: MediaStream | null; error: string | null; isDenied: boolean }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        stream: null,
        error: 'Camera access is not supported by your browser or environment.',
        isDenied: false,
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false, // Strictly NO microphone requested
      });

      return {
        stream,
        error: null,
        isDenied: false,
      };
    } catch (err: any) {
      console.warn('[PermissionService] Camera access error:', err);
      const isDenied = 
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        err.name === 'SecurityError';

      let errorMsg = 'Could not access the camera. Please check your device settings.';
      if (isDenied) {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings to take study photos.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found on this device. You can upload a photo from your files instead.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is already in use by another application or tab.';
      }

      return {
        stream: null,
        error: errorMsg,
        isDenied,
      };
    }
  }

  /**
   * Request Microphone permission and acquire audio stream ONLY.
   * Never requests video when accessing the microphone.
   */
  public static async requestMicrophoneStream(): Promise<{
    stream: MediaStream | null;
    error: string | null;
    isDenied: boolean;
  }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        stream: null,
        error: 'Audio access is not supported in this browser.',
        isDenied: false,
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false, // Strictly NO camera requested
      });

      return {
        stream,
        error: null,
        isDenied: false,
      };
    } catch (err: any) {
      console.warn('[PermissionService] Microphone access error:', err);
      const isDenied = 
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        err.name === 'SecurityError';

      let errorMsg = 'Could not access the microphone. Please check your audio settings.';
      if (isDenied) {
        errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser settings for voice dictation.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No microphone device was detected.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Microphone is currently in use by another program.';
      }

      return {
        stream: null,
        error: errorMsg,
        isDenied,
      };
    }
  }

  /**
   * Safely stop all tracks on a MediaStream
   */
  public static stopStream(stream: MediaStream | null) {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
    } catch (err) {
      console.error('[PermissionService] Error stopping stream tracks:', err);
    }
  }

  /**
   * Browser settings instructions for allowing denied permissions
   */
  public static getPermissionInstructions(type: PermissionType): PermissionHelpStep[] {
    const permLabel = type === 'camera' ? 'Camera' : 'Microphone';
    return [
      {
        browser: 'Google Chrome / Chromium / Edge',
        steps: [
          `Click the Lock 🔒 or Site Settings icon on the left side of the address bar.`,
          `Find "${permLabel}" in the dropdown menu.`,
          `Change the permission setting from "Block" to "Allow".`,
          `Reload or click "Try Again" to activate ${permLabel.toLowerCase()} access.`,
        ],
      },
      {
        browser: 'Safari (macOS / iOS)',
        steps: [
          `macOS: Click "Safari" > "Settings for This Website" > set ${permLabel} to "Allow".`,
          `iOS / iPadOS: Tap the "aA" or Page Settings icon in the URL bar > Website Settings > ${permLabel} > Allow.`,
          `Return to StudyMate AI and tap Try Again.`,
        ],
      },
      {
        browser: 'Mozilla Firefox',
        steps: [
          `Click the Permissions icon (shield or lock) on the left of the URL bar.`,
          `Clear the blocked "${permLabel}" permission by clicking the "x" next to Blocked.`,
          `Tap "Try Again" to re-prompt for permission.`,
        ],
      },
    ];
  }
}
