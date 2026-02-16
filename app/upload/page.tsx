'use client'

import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import VideoUpload from '@/components/upload/VideoUpload'
import VideoPreview from '@/components/upload/VideoPreview'
import AudioUploadEnhanced from '@/components/upload/AudioUploadEnhanced'
import ShotCreator from '@/components/upload/ShotCreator'
import VideoDownload from '@/components/upload/VideoDownload'
import StepProgress from '@/components/personalize/StepProgress'
import { lipdubApi, type VideoUploadResponse } from '@/lib/lipdub-api'

type FlowStep = 'video' | 'audio' | 'creating' | 'complete'

interface FlowState {
  videoFile: File | null
  videoUpload: VideoUploadResponse | null
  audioId: string | null
  scriptText: string | null
  shotId: number | null
  generateId: string | null
}

export default function UploadFlowPage() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('video')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [state, setState] = useState<FlowState>({
    videoFile: null,
    videoUpload: null,
    audioId: null,
    scriptText: null,
    shotId: null,
    generateId: null,
  })

  // Handle video upload with progress
  const handleVideoUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(10)

    try {
      // Step 1: Initiate upload
      const upload = await lipdubApi.initiateVideoUpload({
        file_name: file.name,
        content_type: file.type,
        project_name: 'Jaime AI Project',
        scene_name: 'Scene 1',
        actor_name: 'Actor',
      })

      setState(prev => ({ ...prev, videoUpload: upload, videoFile: file }))
      setUploadProgress(30)

      // Step 2: Upload file to signed URL
      await lipdubApi.uploadFileToUrl(upload.upload_url, file)
      setUploadProgress(50)

      // Step 3: Notify success
      await lipdubApi.notifyUploadSuccess(upload.success_url)
      setUploadProgress(70)

      // Step 4: Poll for video processing (briefly, then move to audio)
      const checkStatus = async () => {
        try {
          const videoStatus = await lipdubApi.getVideoStatus(upload.video_id)
          if (videoStatus.upload_status === 'completed') {
            return true
          }
        } catch (err) {
          console.log('Video still processing...')
        }
        return false
      }

      // Quick check, then proceed (processing continues in background)
      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        const done = await checkStatus()
        setUploadProgress(prev => Math.min(prev + 5, 100))
        
        if (done || attempts >= 6) {
          clearInterval(interval)
          setIsUploading(false)
          setCurrentStep('audio')
        }
      }, 1500)

    } catch (err) {
      console.error('Video upload failed:', err)
      setIsUploading(false)
    }
  }

  // Handle audio/script completion
  const handleAudioComplete = (audioId: string, scriptText?: string) => {
    setState(prev => ({
      ...prev,
      audioId: audioId || null,
      scriptText: scriptText || null,
    }))
    setCurrentStep('creating')
  }

  // Handle shot creation completion
  const handleShotComplete = (shotId: number, generateId: string) => {
    setState(prev => ({
      ...prev,
      shotId,
      generateId,
    }))
    setCurrentStep('complete')
  }

  // Handle errors
  const handleError = (error: string) => {
    console.error('Flow error:', error)
    // Could show error UI here
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'video':
        return (
          <VideoUpload
            onUpload={handleVideoUpload}
            onContinue={() => setCurrentStep('audio')}
            onCancel={() => window.history.back()}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadComplete={state.videoUpload !== null && !isUploading && uploadProgress >= 100}
          />
        )
      
      case 'audio':
        return (
          <div className="space-y-6">
            {/* Show uploaded video preview */}
            <VideoPreview
              filename={state.videoFile?.name || 'video.mp4'}
              duration="Processing..."
              size={`${((state.videoFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB`}
              onDelete={() => {
                setState({
                  videoFile: null,
                  videoUpload: null,
                  audioId: null,
                  scriptText: null,
                  shotId: null,
                  generateId: null,
                })
                setCurrentStep('video')
              }}
            />

            {/* Audio upload with tabs */}
            <AudioUploadEnhanced
              videoId={state.videoUpload?.video_id || ''}
              onComplete={handleAudioComplete}
              onCancel={() => setCurrentStep('video')}
            />
          </div>
        )
      
      case 'creating':
        return (
          <ShotCreator
            videoId={state.videoUpload?.video_id || ''}
            audioId={state.audioId || undefined}
            scriptText={state.scriptText || undefined}
            onComplete={handleShotComplete}
            onError={handleError}
          />
        )
      
      case 'complete':
        return (
          <VideoDownload
            shotId={state.shotId || 0}
            generateId={state.generateId || ''}
            filename={`jaime_video_${Date.now()}.mp4`}
          />
        )
      
      default:
        return null
    }
  }

  const getStepNumber = () => {
    switch (currentStep) {
      case 'video': return 1
      case 'audio': return 2
      case 'creating': return 3
      case 'complete': return 4
      default: return 1
    }
  }

  const customSteps = [
    { number: 1, label: 'Crear Proyecto', icon: () => null },
    { number: 2, label: 'Video Maestro', icon: () => null },
    { number: 3, label: 'Audio Personalizado', icon: () => null },
    { number: 4, label: 'Ver Video Final', icon: () => null },
  ]

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <StepProgress 
          currentStep={getStepNumber()} 
          steps={customSteps}
        />

        <div className="mt-8">
          {renderStep()}
        </div>
      </div>
    </Layout>
  )
}
