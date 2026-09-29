import React, { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Camera, StopCircle, Video } from 'lucide-react'
import { Button } from './ui/Button'

export const VideoRecorder: React.FC<{ onRecordingComplete: (file: File) => void }> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(mediaStream)
    } catch (err) {
      console.error("Error accessing media devices.", err)
      alert("Could not access camera or microphone. Please check permissions.")
    }
  }

  // Bind stream to video element once activated
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const startRecording = () => {
    if (!stream) return
    chunksRef.current = []
    
    // Choose the best MIME type supported
    let options = { mimeType: 'video/webm;codecs=vp9,opus' }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' }
      }
    }

    try {
      const recorder = new MediaRecorder(stream, options)
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' })
        onRecordingComplete(file)
        stopCamera()
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (e) {
      console.error("MediaRecorder error:", e)
      alert("Recording failed on this device.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Cleanup stream on component unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto p-4 bg-surface border border-white/5 rounded-2xl shadow-xl">
      <div className="relative aspect-video bg-[#05050A] rounded-xl overflow-hidden flex items-center justify-center ring-1 ring-white/10">
        {stream ? (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover shadow-2xl" 
          />
        ) : (
          <div className="flex flex-col items-center text-textPrimary/40 gap-3">
            <Camera size={48} className="opacity-50" />
            <p className="font-display">Camera Offline</p>
          </div>
        )}
        
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: [1, 0.5, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-500 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest shadow-lg shadow-red-500/20"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" />
            REC
          </motion.div>
        )}
      </div>

      <div className="flex justify-center gap-4 mt-2">
        {!stream ? (
          <Button onClick={startCamera} variant="primary" className="w-full sm:w-auto hover:scale-105 active:scale-95 transition-transform">
            <Video className="w-5 h-5 mr-2" /> Activate Media
          </Button>
        ) : !isRecording ? (
          <>
            <Button onClick={startRecording} className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto shadow-red-500/30 hover:scale-105 active:scale-95 transition-transform">
              <span className="w-3.5 h-3.5 rounded-full bg-white mr-2.5" /> Start Recording
            </Button>
            <Button onClick={stopCamera} variant="ghost">Cancel</Button>
          </>
        ) : (
          <Button onClick={stopRecording} variant="secondary" className="w-full sm:w-auto border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:scale-105 active:scale-95 transition-transform">
            <StopCircle className="w-5 h-5 mr-2" /> Stop Recording
          </Button>
        )}
      </div>
    </div>
  )
}
