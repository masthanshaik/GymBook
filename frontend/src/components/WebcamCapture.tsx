import { useRef, useState, useEffect } from 'react'
import { Camera, RotateCcw, Check } from 'lucide-react'

interface Props {
  value?: string | null
  onCapture: (dataUrl: string) => void
}

const WebcamCapture = ({ value, onCapture }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStreaming(true)
    } catch {
      setError('Could not access camera. Please allow camera permission.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStreaming(false)
  }

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const size = Math.min(video.videoWidth, video.videoHeight)
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // center-crop square
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    onCapture(dataUrl)
    stopCamera()
  }

  const retake = () => {
    onCapture('')
    startCamera()
  }

  useEffect(() => () => stopCamera(), [])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-40 h-40 rounded-2xl overflow-hidden bg-ink-100 border-2 border-dashed border-ink-300 flex items-center justify-center relative">
        {value ? (
          <img src={value} alt="Member" className="w-full h-full object-cover" />
        ) : streaming ? (
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        ) : (
          <Camera size={36} className="text-ink-400" />
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {error && <p className="text-flame-600 text-xs text-center">{error}</p>}

      <div className="flex gap-2">
        {value ? (
          <button type="button" onClick={retake} className="btn-ghost text-sm flex items-center gap-1.5">
            <RotateCcw size={15} /> Retake
          </button>
        ) : streaming ? (
          <button type="button" onClick={capture} className="btn-primary text-sm flex items-center gap-1.5">
            <Check size={15} /> Capture
          </button>
        ) : (
          <button type="button" onClick={startCamera} className="btn-dark text-sm flex items-center gap-1.5">
            <Camera size={15} /> Open Camera
          </button>
        )}
      </div>
    </div>
  )
}

export default WebcamCapture
