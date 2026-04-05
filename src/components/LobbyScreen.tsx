import { useState } from 'react';
import { useConnectionStore } from '../stores/useConnectionStore';
import { useGameStore } from '../stores/useGameStore';
import { GameLoop } from '../game/GameLoop';

export default function LobbyScreen() {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    peerId,
    connectionRole,
    connectionState,
    createRoom,
    joinRoom,
    setRole,
  } = useConnectionStore();

  const { setPhase } = useGameStore();

  const copyToClipboard = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectRole = (selectedRole: 'astronaut' | 'missionControl') => {
    setRole(selectedRole);
    setPhase('playing');
    GameLoop.start();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-12" style={{ fontFamily: 'monospace' }}>
        LAST SIGNAL
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-600 rounded text-red-200 text-center max-w-md">
          {error}
        </div>
      )}

      {connectionState === 'idle' && (
        <div className="space-y-8">
          <button
            onClick={() => {
              setError('');
              void createRoom().catch((err: Error) => {
                setError(err.message);
              });
            }}
            className="w-64 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
          >
            Create Room
          </button>

          <div className="border-t border-gray-700 pt-8">
            <p className="text-gray-400 text-sm mb-4">or</p>
            <div className="flex flex-col space-y-3">
              <input
                id="room-code"
                name="roomCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                placeholder="Paste room ID here"
                className="w-64 px-4 py-3 bg-gray-800 border border-gray-700 rounded text-center text-sm font-mono"
              />
              <button
                onClick={() => {
                  setError('');
                  void joinRoom(joinCode).catch((err: Error) => {
                    setError(err.message);
                  });
                }}
                className="w-64 px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold transition"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      )}

      {connectionState === 'waiting' && (
        connectionRole === 'host' ? (
          <div className="text-center max-w-md">
            <p className="text-lg text-gray-300 mb-6">Share this Room ID:</p>
            <div className="bg-gray-800 border border-gray-600 rounded p-4 mb-6 break-all font-mono text-sm">
              {peerId}
            </div>
            <button
              onClick={copyToClipboard}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition mb-4"
            >
              {copied ? 'Copied!' : 'Copy ID'}
            </button>
            <p className="text-gray-400 text-sm">Waiting for partner to join...</p>
          </div>
        ) : (
          <div className="text-center max-w-md">
            <p className="text-lg text-gray-300 mb-4">Joining Room</p>
            <div className="bg-gray-800 border border-gray-600 rounded p-4 mb-4 break-all font-mono text-sm">
              {peerId}
            </div>
            <p className="text-gray-400 text-sm">Waiting for the host to finish the connection handshake...</p>
          </div>
        )
      )}

      {connectionState === 'connected' && (
        <div className="text-center">
          <p className="text-2xl mb-8">Connection Established!</p>
          <p className="text-xl mb-6">Select Your Role:</p>
          <div className="flex space-x-4">
            <button
              onClick={() => selectRole('astronaut')}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 rounded font-semibold transition"
              style={{ fontFamily: 'monospace' }}
            >
              ASTRONAUT
            </button>
            <button
              onClick={() => selectRole('missionControl')}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded font-semibold transition"
              style={{ fontFamily: 'monospace' }}
            >
              MISSION CONTROL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
