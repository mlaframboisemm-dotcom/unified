import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Upload,
  Flashlight,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface CameraQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedData: {
    raw: string;
    address: string;
    amount?: number;
    currency?: string;
    memo?: string;
  }) => void;
  title?: string;
  instruction?: string;
}

export default function CameraQrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan ATM Machine or Wallet QR',
  instruction = 'Point your camera at the QR code displayed on the physical ATM screen or recipient wallet.'
}: CameraQrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMessage(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        setErrorMessage('Camera access is not supported on this browser/device.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setHasCameraPermission(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings or paste the address manually below.');
      } else {
        setErrorMessage('Unable to initialize video camera. Please use manual input or upload a QR image.');
      }
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Scanning loop using BarcodeDetector if available
  const startScanningLoop = () => {
    const video = videoRef.current;
    if (!video) return;

    let isRunning = true;

    // Check for native BarcodeDetector API (standard in Chrome / Android / modern WebRTC)
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    const barcodeDetector = hasBarcodeDetector
      ? new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      : null;

    const scanFrame = async () => {
      if (!isRunning || !videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        if (isRunning) requestAnimationFrame(scanFrame);
        return;
      }

      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              isRunning = false;
              handleParsedPayload(rawValue);
              return;
            }
          }
        } catch {
          // Ignore transient detection errors
        }
      }

      if (isRunning) {
        requestAnimationFrame(scanFrame);
      }
    };

    requestAnimationFrame(scanFrame);
  };

  const handleParsedPayload = (raw: string) => {
    stopCamera();
    const cleanRaw = raw.trim();

    let address = cleanRaw;
    let amount: number | undefined;
    let currency: string | undefined = 'BTC';
    let memo: string | undefined;

    // Handle BIP-21 URI (e.g. bitcoin:bc1q...?amount=0.005&message=ATM)
    if (cleanRaw.toLowerCase().startsWith('bitcoin:')) {
      currency = 'BTC';
      const withoutPrefix = cleanRaw.slice(8);
      const [addrPart, queryPart] = withoutPrefix.split('?');
      address = addrPart;

      if (queryPart) {
        const params = new URLSearchParams(queryPart);
        if (params.has('amount')) {
          amount = parseFloat(params.get('amount') || '0');
        }
        if (params.has('message')) {
          memo = params.get('message') || undefined;
        } else if (params.has('label')) {
          memo = params.get('label') || undefined;
        }
      }
    } else if (cleanRaw.includes(':')) {
      const parts = cleanRaw.split(':');
      currency = parts[0].toUpperCase();
      const rest = parts[1] || '';
      const [addrPart, queryPart] = rest.split('?');
      address = addrPart;
      if (queryPart) {
        const params = new URLSearchParams(queryPart);
        if (params.has('amount')) amount = parseFloat(params.get('amount') || '0');
      }
    }

    onScanSuccess({
      raw: cleanRaw,
      address,
      amount: amount && !isNaN(amount) ? amount : undefined,
      currency,
      memo
    });
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    handleParsedPayload(manualInput);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = async () => {
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            handleParsedPayload(barcodes[0].rawValue);
            return;
          }
        } catch (err) {
          console.warn('Image detector error:', err);
        }
      }
      setErrorMessage('Could not find a valid QR code in that image. Please try another image or paste manually.');
    };
    img.src = URL.createObjectURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl text-white flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">Real-time WebRTC Camera Scanner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Targeting Frame Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-64 h-64 border-2 border-amber-400/80 rounded-2xl relative shadow-lg shadow-amber-500/20">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

              {/* Animated laser line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-bounce mt-32" />
            </div>
          </div>

          {/* Fallback permission / error screen */}
          {hasCameraPermission === false && (
            <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-xs text-slate-300 max-w-xs">{errorMessage || 'Camera access unavailable.'}</p>
              <label className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md">
                <Upload className="w-4 h-4" />
                <span>Upload QR Screenshot</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Footer Controls & Manual Input */}
        <div className="p-5 bg-slate-950 space-y-3">
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            {instruction}
          </p>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or paste Bitcoin address / BIP-21 URI"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSubmit();
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleManualSubmit}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shrink-0"
              >
                <span>Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
