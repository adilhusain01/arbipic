import React, { useEffect, useState } from 'react';

interface EnvStatus {
  name: string;
  value: string;
  status: 'ok' | 'missing' | 'placeholder';
  warning?: string;
}

export function EnvCheck() {
  const [envVars, setEnvVars] = useState<EnvStatus[]>([]);
  const [pinataStatus, setPinataStatus] = useState<string>('Checking...');

  useEffect(() => {
    // Check environment variables
    const vars: EnvStatus[] = [
      {
        name: 'VITE_PINATA_API_KEY',
        value: import.meta.env.VITE_PINATA_API_KEY || '',
        status: import.meta.env.VITE_PINATA_API_KEY ? 'ok' : 'missing',
      },
      {
        name: 'VITE_PINATA_SECRET_KEY',
        value: import.meta.env.VITE_PINATA_SECRET_KEY || '',
        status: import.meta.env.VITE_PINATA_SECRET_KEY ? 'ok' : 'missing',
      },
      {
        name: 'VITE_NFT_STORAGE_KEY',
        value: import.meta.env.VITE_NFT_STORAGE_KEY || '',
        status: import.meta.env.VITE_NFT_STORAGE_KEY ? 'ok' : 'missing',
        warning: 'Optional - only needed if using NFT.Storage instead of Pinata',
      },
      {
        name: 'VITE_VERIFIER_ADDRESS',
        value: import.meta.env.VITE_VERIFIER_ADDRESS || '',
        status: import.meta.env.VITE_VERIFIER_ADDRESS === '0x...' || !import.meta.env.VITE_VERIFIER_ADDRESS
          ? 'placeholder'
          : 'ok',
        warning: import.meta.env.VITE_VERIFIER_ADDRESS === '0x...'
          ? 'Placeholder value detected - update with deployed contract address'
          : undefined,
      },
    ];

    setEnvVars(vars);

    // Test Pinata connection
    const apiKey = import.meta.env.VITE_PINATA_API_KEY;
    const secretKey = import.meta.env.VITE_PINATA_SECRET_KEY;

    if (apiKey && secretKey) {
      fetch('https://api.pinata.cloud/data/testAuthentication', {
        headers: {
          pinata_api_key: apiKey,
          pinata_secret_api_key: secretKey,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setPinataStatus(`✓ ${data.message}`);
        })
        .catch((err) => {
          setPinataStatus(`✗ Error: ${err.message}`);
        });
    } else {
      setPinataStatus('✗ Missing Pinata credentials');
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-500';
      case 'missing':
        return 'text-red-500';
      case 'placeholder':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return '✓';
      case 'missing':
        return '✗';
      case 'placeholder':
        return '⚠';
      default:
        return '?';
    }
  };

  return (
    <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4">🔍 Environment Variables Status</h2>

      <div className="space-y-3 mb-6">
        {envVars.map((env) => (
          <div
            key={env.name}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-purple-400">{env.name}</span>
              <span className={`font-bold ${getStatusColor(env.status)}`}>
                {getStatusIcon(env.status)} {env.status.toUpperCase()}
              </span>
            </div>

            {env.value && (
              <div className="font-mono text-xs text-gray-400 bg-gray-900 p-2 rounded overflow-x-auto">
                {env.value.length > 80
                  ? `${env.value.substring(0, 77)}...`
                  : env.value}
              </div>
            )}

            {env.warning && (
              <div className="mt-2 text-xs text-yellow-400 italic">
                ⚠ {env.warning}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">📡 Pinata API Test</h3>
        <p className={`font-mono text-sm ${pinataStatus.includes('✓') ? 'text-green-500' : 'text-red-500'}`}>
          {pinataStatus}
        </p>
      </div>

      <div className="mt-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">ℹ️ How to Fix</h3>
        <ol className="text-xs text-blue-200 space-y-1 list-decimal list-inside">
          <li>Create/update <code className="bg-gray-800 px-1 rounded">.env</code> file in the <code className="bg-gray-800 px-1 rounded">frontend/</code> directory</li>
          <li>Add missing variables with format: <code className="bg-gray-800 px-1 rounded">VITE_VARIABLE_NAME=value</code></li>
          <li>Restart the dev server (<code className="bg-gray-800 px-1 rounded">npm run dev</code>)</li>
          <li>Never commit <code className="bg-gray-800 px-1 rounded">.env</code> to git (use <code className="bg-gray-800 px-1 rounded">.env.example</code> instead)</li>
        </ol>
      </div>
    </div>
  );
}
