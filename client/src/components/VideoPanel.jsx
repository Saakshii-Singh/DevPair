import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, UserCheck } from 'lucide-react';

function VideoPanel({ socket, roomId, role, peer, username }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isPeerAudioMuted, setIsPeerAudioMuted] = useState(false); // Can be linked if peer sends notification
  const [isPeerVideoMuted, setIsPeerVideoMuted] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);

  useEffect(() => {
    let streamInstance = null;

    async function setupMediaAndWebRTC() {
      // 1. Get User Media (Camera & Audio)
      try {
        streamInstance = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
          audio: true
        });
        setLocalStream(streamInstance);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamInstance;
        }
      } catch (err) {
        console.warn("Could not access camera or microphone. Proceeding in audio/video-less mode.", err);
      }

      // 2. Initialize Peer Connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;

      // 3. Attach Local Tracks to Peer Connection
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => {
          pc.addTrack(track, streamInstance);
        });
      }

      // 4. Handle ICE Candidate generation
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && roomId) {
          socket.emit('signal', { 
            roomId, 
            signalData: { candidate: event.candidate } 
          });
        }
      };

      // 5. Handle Incoming Remote Tracks
      pc.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      // 6. Handle socket signaling data
      socket.on('signal', async (signalData) => {
        try {
          if (signalData.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
            
            // If we receive an Offer, we must respond with an Answer
            if (signalData.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('signal', { 
                roomId, 
                signalData: { sdp: pc.localDescription } 
              });
            }
          } else if (signalData.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          }
        } catch (error) {
          console.error("Error processing incoming signaling data:", error);
        }
      });

      // 7. If this user is designated as the initiator, generate the SDP Offer
      // Interviewer initiates the connection
      if (role === 'Interviewer') {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal', { 
            roomId, 
            signalData: { sdp: pc.localDescription } 
          });
          console.log("WebRTC: Initiated offer sent.");
        } catch (err) {
          console.error("Failed to create offer:", err);
        }
      }
    }

    setupMediaAndWebRTC();

    return () => {
      // Cleanup WebRTC connection
      if (socket) {
        socket.off('signal');
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      }
      setLocalStream(null);
      setRemoteStream(null);
    };
  }, [socket, roomId, role]);

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="video-grid">
      {/* Remote User Stream */}
      <div className="video-box">
        {remoteStream ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            style={{ display: isPeerVideoMuted ? 'none' : 'block' }}
          />
        ) : (
          <div className="video-placeholder">
            <div className="video-placeholder-icon">🎥</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Connecting to {peer ? peer.name : 'partner'}...
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Negotiating Peer-to-Peer link
            </span>
          </div>
        )}
        
        <div className="video-overlay-name">
          <Volume2 size={12} style={{ color: 'var(--success)' }} />
          <span>{peer ? peer.name : 'Partner'}</span>
          <span style={{ 
            fontSize: '0.65rem', 
            color: 'var(--primary)', 
            background: 'rgba(139, 92, 246, 0.2)',
            padding: '0.1rem 0.3rem',
            borderRadius: '3px'
          }}>
            {role === 'Interviewer' ? 'Candidate' : 'Interviewer'}
          </span>
        </div>
      </div>

      {/* Local User Stream */}
      <div className="video-box" style={{ border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        {localStream ? (
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ display: isVideoMuted ? 'none' : 'block', transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="video-placeholder">
            <div className="video-placeholder-icon" style={{ animation: 'none', opacity: 0.5 }}>📷</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Camera access disabled</div>
          </div>
        )}

        <div className="video-overlay-name">
          <UserCheck size={12} style={{ color: 'var(--primary)' }} />
          <span>You ({username})</span>
          <span style={{ 
            fontSize: '0.65rem', 
            color: 'var(--success)', 
            background: 'rgba(16, 185, 129, 0.2)',
            padding: '0.1rem 0.3rem',
            borderRadius: '3px'
          }}>
            {role}
          </span>
        </div>

        <div className="video-controls">
          <button 
            onClick={toggleAudio} 
            className={`video-btn ${isAudioMuted ? 'muted' : ''}`}
            title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button 
            onClick={toggleVideo} 
            className={`video-btn ${isVideoMuted ? 'muted' : ''}`}
            title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoMuted ? <VideoOff size={14} /> : <Video size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoPanel;
