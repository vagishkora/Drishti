import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from './ui/Button'

interface ImageCropperProps {
  image: string
  aspect?: number
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ 
  image, 
  aspect = 1, 
  onCropComplete, 
  onCancel 
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop)
  }

  const onZoomChange = (zoom: number) => {
    setZoom(zoom)
  }

  const onCropCompleteCallback = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.setAttribute('crossOrigin', 'anonymous') // To avoid CORS issues
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) throw new Error('No 2d context')

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
      }, 'image/jpeg', 0.9)
    })
  }

  const handleDone = async () => {
    try {
      if (croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(image, croppedAreaPixels)
        onCropComplete(croppedBlob)
      }
    } catch (e) {
      console.error('Failed to crop image:', e)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[80vh] shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-white">Crop Profile Picture</h3>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6 text-white/60" />
          </button>
        </div>

        <div className="relative flex-1 bg-[#0a0a0a]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={onZoomChange}
            classes={{
              containerClassName: 'bg-black',
              mediaClassName: 'max-w-none',
            }}
          />
        </div>

        <div className="p-6 bg-surface border-t border-white/5 space-y-6">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-white/40" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-white/40" />
          </div>

          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleDone}>
              <Check className="w-4 h-4 mr-2" /> Complete Crop
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
