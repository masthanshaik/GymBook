import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { QrCode, CheckCircle, XCircle, Camera, User, Search, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@services/api'

interface Member { id: string; first_name: string; last_name: string; phone: string }
interface CheckInRecord { member_name: string; time: string; method: string }

export default function QRCheckin() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastCheckin, setLastCheckin] = useState<CheckInRecord | null>(null)
  const [recentCheckins, setRecentCheckins] = useState<CheckInRecord[]>([])
  const [memberQR, setMemberQR] = useState<{ name: string; qr: string } | null>(null)
  const [loadingQR, setLoadingQR] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [tab, setTab] = useState<'scan' | 'manual' | 'qrcode'>('scan')

  useEffect(() => {
    apiClient.getMembers(1, 200).then(r => setMembers(r.data.items || []))
    return () => stopCamera()
  }, [])

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setScanning(true)
      startScanning()
    } catch {
      setCameraError('Camera access denied. Use manual check-in below.')
    }
  }

  const startScanning = () => {
    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video.readyState < 2) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      decodeQR(imageData)
    }, 500)
  }

  const decodeQR = async (_imageData: ImageData) => {
    try {
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        const canvas = canvasRef.current!
        const blob = await new Promise<Blob>(resolve =>
          canvas.toBlob(b => resolve(b!), 'image/png')
        )
        const bitmapImg = await createImageBitmap(blob)
        const codes = await detector.detect(bitmapImg)
        if (codes.length > 0) {
          const qrData = codes[0].rawValue as string
          if (qrData.startsWith('GYMBOOK:CHECKIN:')) {
            const memberId = qrData.replace('GYMBOOK:CHECKIN:', '')
            await handleCheckIn(memberId, 'qr')
          }
        }
      }
    } catch {
      // BarcodeDetector not available or error — silent fail
    }
  }

  const handleCheckIn = useCallback(async (memberId: string, method = 'manual') => {
    if (checkingIn) return
    setCheckingIn(true)
    try {
      await apiClient.checkIn({ member_id: memberId, check_in_method: method })
      const member = members.find(m => m.id === memberId)
      const name = member ? `${member.first_name} ${member.last_name}` : 'Member'
      const record = { member_name: name, time: new Date().toLocaleTimeString('en-IN'), method }
      setLastCheckin(record)
      setRecentCheckins(prev => [record, ...prev.slice(0, 9)])
      toast.success(`✓ ${name} checked in!`)
      setSearch('')
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Check-in failed'
      if (msg.includes('already checked in')) {
        toast.error('Member is already checked in')
      } else {
        toast.error(msg)
      }
    } finally {
      setCheckingIn(false)
    }
  }, [members, checkingIn])

  const showMemberQR = async (member: Member) => {
    setLoadingQR(true)
    setMemberQR(null)
    try {
      const r = await apiClient.getMemberQR(member.id)
      setMemberQR({ name: `${member.first_name} ${member.last_name}`, qr: r.data.qr_image_base64 })
    } catch { toast.error('Could not load QR code') } finally { setLoadingQR(false) }
  }

  const filtered = members.filter(m =>
    `${m.first_name} ${m.last_name} ${m.phone}`.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">QR Check-in</h1>
        <p className="text-slate-500 text-sm mt-0.5">Scan QR codes or manually check in members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slate-200 rounded-xl w-fit">
            {(['scan', 'manual', 'qrcode'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); if (t !== 'scan') stopCamera() }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'qrcode' ? 'QR Code' : t}
              </button>
            ))}
          </div>

          {/* Scan tab */}
          {tab === 'scan' && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-orange-500" />
                <h2 className="font-semibold text-slate-900">Camera Scanner</h2>
                {'BarcodeDetector' in window ? (
                  <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Supported</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Limited support</span>
                )}
              </div>

              <div className="relative bg-slate-950 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3', maxHeight: 340 }}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                      <QrCode size={32} className="text-white/60" />
                    </div>
                    <button onClick={startCamera}
                      className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition">
                      Start Camera
                    </button>
                    {cameraError && <p className="text-red-400 text-xs text-center px-4">{cameraError}</p>}
                  </div>
                )}

                {scanning && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-orange-400 rounded-2xl">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-500 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-500 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-500 rounded-br-lg" />
                      </div>
                    </div>
                    <button onClick={stopCamera}
                      className="absolute top-3 right-3 px-3 py-1 bg-black/40 text-white rounded-lg text-xs hover:bg-black/60 transition">
                      Stop
                    </button>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="text-white/70 text-xs bg-black/40 px-3 py-1 rounded-full">Point at member's QR code</span>
                    </div>
                  </>
                )}
              </div>

              {!('BarcodeDetector' in window) && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                  BarcodeDetector API not available in this browser. Use manual check-in or Chrome for QR scanning.
                </p>
              )}
            </div>
          )}

          {/* Manual tab */}
          {tab === 'manual' && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <User size={18} className="text-orange-500" />
                <h2 className="font-semibold text-slate-900">Manual Check-in</h2>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search member by name or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
              {search && (
                <div className="space-y-2">
                  {filtered.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No members found</p>
                  ) : (
                    filtered.map(m => (
                      <div key={m.id}
                        className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-orange-50 transition group cursor-pointer"
                        onClick={() => handleCheckIn(m.id)}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold">
                            {m.first_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{m.first_name} {m.last_name}</p>
                            <p className="text-xs text-slate-400">{m.phone}</p>
                          </div>
                        </div>
                        <button
                          disabled={checkingIn}
                          className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition disabled:opacity-50">
                          {checkingIn ? '...' : 'Check In'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
              {!search && (
                <p className="text-slate-400 text-sm text-center py-6">Start typing to search for a member</p>
              )}
            </div>
          )}

          {/* QR Code tab */}
          {tab === 'qrcode' && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-orange-500" />
                <h2 className="font-semibold text-slate-900">Member QR Codes</h2>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search member..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
              {search && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filtered.map(m => (
                    <button key={m.id} onClick={() => showMemberQR(m)}
                      className="flex flex-col items-center p-4 bg-slate-50 rounded-xl hover:bg-orange-50 transition text-center">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm mb-2">
                        {m.first_name[0]}
                      </div>
                      <p className="text-xs font-medium text-slate-700 truncate w-full">{m.first_name} {m.last_name}</p>
                      <p className="text-xs text-orange-500 mt-1">View QR</p>
                    </button>
                  ))}
                </div>
              )}
              {memberQR && (
                <div className="flex flex-col items-center gap-3 mt-4 p-6 bg-slate-50 rounded-2xl">
                  {loadingQR ? (
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  ) : memberQR.qr ? (
                    <>
                      <img src={memberQR.qr} alt="QR Code" className="w-40 h-40 rounded-xl" />
                      <p className="font-semibold text-slate-900">{memberQR.name}</p>
                      <p className="text-xs text-slate-400">Share this QR code with the member</p>
                      <a href={memberQR.qr} download={`${memberQR.name}-qr.png`}
                        className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition">
                        Download QR
                      </a>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">QR code not available. Install qrcode[pil] on the server.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel: status + recent */}
        <div className="space-y-4">
          {/* Last check-in */}
          <div className={`card p-5 ${lastCheckin ? 'border-emerald-200 bg-emerald-50/50' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              {lastCheckin ? (
                <CheckCircle size={18} className="text-emerald-500" />
              ) : (
                <XCircle size={18} className="text-slate-300" />
              )}
              <h2 className="font-semibold text-slate-900 text-sm">Last Check-in</h2>
            </div>
            {lastCheckin ? (
              <motion.div key={lastCheckin.time} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <p className="text-lg font-bold text-slate-900">{lastCheckin.member_name}</p>
                <p className="text-sm text-slate-500 mt-1">{lastCheckin.time} · via {lastCheckin.method}</p>
              </motion.div>
            ) : (
              <p className="text-slate-400 text-sm">No check-ins yet</p>
            )}
          </div>

          {/* Recent list */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <Clock size={15} className="text-slate-400" />
              <h2 className="font-semibold text-slate-900 text-sm">Recent ({recentCheckins.length})</h2>
            </div>
            {recentCheckins.length === 0 ? (
              <div className="py-10 text-center">
                <QrCode size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Check-ins appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentCheckins.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle size={13} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.member_name}</p>
                      <p className="text-xs text-slate-400">{r.time}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full shrink-0 capitalize">{r.method}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
