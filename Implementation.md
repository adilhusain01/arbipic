# Technical Implementation Guide: On-Chain Verifiable Photo Capture System with Stylus and Orbit

This guide walks you through building a decentralized app for capturing photos via webcam, making them verifiable on-chain (e.g., via hashing and attestation to prove origin/tamper-proofing), and scaling with Arbitrum's tech. We'll use Stylus for efficient Rust-based contracts (e.g., for hashing/verification logic), integrate Ethereum Attestation Service (EAS) for standardized attestations (deployed on Arbitrum Sepolia at 0x2521021fc8BF070473E1e1801D3c7B4aB701E1dE), and Orbit for a custom L3 chain to handle high-volume verifications cheaply. The frontend is a React web app with Tailwind CSS for styling and react-webcam for photo capture.

This setup aligns with the hackathon's Open Track: Stylus contracts, Orbit experiments, on-chain identity tools, and creative prototypes. For "winning things," include gas benchmarks (Stylus vs. Solidity), a demo video showing live capture-to-verification, ZK extensions for privacy, and a tutorial README—past winners like zkVerify projects emphasize verifiable proofs and ecosystem integrations.

## 1. Prerequisites
- **Hardware/Software**:
  - Rust toolchain (`rustup install stable`).
  - Node.js (v18+), Yarn/npm.
  - Cargo Stylus CLI: `cargo install cargo-stylus --locked`.
  - Arbitrum Sepolia testnet ETH (faucet: https://sepolia-faucet.pk910.de/).
  - MetaMask or similar wallet.
- **Libraries**:
  - Stylus SDK: Add to Cargo.toml: `stylus-sdk = { version = "0.6.0", features = ["reentrant"] }`.
  - For hashing: Rust's `sha3` crate.
  - React deps: `react-webcam`, `js-sha256` (for client-side hash), `wagmi` for wallet/on-chain interactions.
- **Knowledge**: Basic Rust, React, Ethereum. Review EAS docs for attestations.

## 2. Setting Up the Development Environment
1. **Project Structure**:
   - `cargo stylus new verifiable-photo` for the Rust project.
   - Add `frontend/`: `npx create-react-app frontend --template=typescript`.
   - In frontend: `yarn add tailwindcss postcss autoprefixer wagmi viem @tanstack/react-query react-webcam js-sha256`.
   - Init Tailwind: `npx tailwindcss init -p`, configure `tailwind.config.js` with `content: ["./src/**/*.{js,ts,jsx,tsx}"]`.
   - Directories: `contracts/` (Rust), `frontend/` (React), `scripts/` (deploy JS).

2. **Local Dev Node**:
   - Run a local Arbitrum Nitro node: `docker run --rm -it -p 8547:8547 offchainlabs/nitro-node-dev --chain-id 412346 --http-port 0.0.0.0:8547`.
   - Use test private key for funding.

3. **Testnet Config**:
   - Add Arbitrum Sepolia to wallet (RPC: https://sepolia.arbitrum.io/rpc).

## 3. Implementing Smart Contracts with Stylus (Rust)
Use Stylus for a custom verifier contract that hashes photos and interacts with EAS for attestations. Stylus' WASM efficiency makes hashing/verification ~10x cheaper. EAS provides schema-based attestations (e.g., "This hash was captured at [timestamp] from [user]").

### 3.1 Verifier Contract
- Handles photo hash submission, timestamp, and EAS attestation call.
- Use `sol_interface!` to call EAS (EVM-compatible).

In `src/verifier.rs`:
```rust
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]
use stylus_sdk::prelude::*;
use stylus_sdk::alloy_primitives::{U256, Address, FixedBytes};
use stylus_sdk::call::Call;
use stylus_sdk::crypto::keccak256;
use stylus_sdk::msg;
use stylus_sdk::evm;

// EAS interface (simplified)
sol_interface! {
    interface IEAS {
        fn attest(bytes32 schema, bytes data) external returns (bytes32);
    }
}

sol_storage! {
    #[entrypoint]
    struct Verifier {
        attestations: Mapping<FixedBytes<32>, U256>, // hash => timestamp
    }
}

#[external]
impl Verifier {
    fn verify_photo(&mut self, photo_hash: FixedBytes<32>) -> Result<FixedBytes<32>, Vec<u8>> {
        let timestamp = evm::block_timestamp();
        self.attestations.insert(photo_hash, timestamp);

        // Call EAS (address on Sepolia)
        let eas_addr = Address::from_slice(&[0x25, 0x21, 0x02, 0x1f, 0xc8, 0xBF, 0x07, 0x04, 0x73, 0xE1, 0xe1, 0x80, 0x1D, 0x3c, 0x7B, 0x4a, 0xB7, 0x01, 0xE1, 0xdE]);
        let eas = IEAS::new(eas_addr);
        let schema = keccak256(b"PhotoVerification(uint256 timestamp, address user, bytes32 hash)");
        let data = abi::encode(&(timestamp, msg::sender(), photo_hash));
        let uid = eas.attest(Call::new_in(self), schema, data)?;

        Ok(uid)
    }

    fn get_attestation(&self, photo_hash: FixedBytes<32>) -> U256 {
        self.attestations.get(photo_hash).unwrap_or(U256::ZERO)
    }
}
```
- Notes: Compute hash client-side (js-sha256), submit to contract. For determinism, use block data. Test with `cargo test` and `cargo stylus test`. Extend with ZK (e.g., via Arbitrum's BoLD) for private proofs—winning feature for anti-deepfake demos.

### 3.2 Build & Check
- `cargo stylus check`.
- Benchmark: Compare gas with Solidity equivalent using `cargo stylus estimate-gas`.

## 4. Deploying to a Custom Orbit Chain
Orbit scales verifications on a dedicated L3.

1. **Acquire Testnet Funds**:
   - Get Arbitrum Sepolia ETH from faucet.

2. **Configure & Deploy via Portal**:
   - Visit https://orbit.arbitrum.io/, connect wallet on Sepolia.
   - Choose Rollup (for security).
   - Config: Native token ETH, low gas pricing for verifications.
   - Deploy: ~0.01 ETH fee; get chain ID/RPC.

3. **Run Orbit Node**:
   - Clone Nitro: `git clone https://github.com/OffchainLabs/nitro`.
   - Build/run with your chain config: Edit `config.json`, run `./nitro --chain-id <your-id> --parent-chain https://sepolia.arbitrum.io/rpc`.

4. **Deploy Contracts to Orbit**:
   - `cargo stylus deploy --endpoint <orbit-rpc> --private-key <key> --no-verify`.
   - Bridge from Sepolia if needed.

## 5. Frontend Development (React + Tailwind CSS)
- Capture photo, hash it, submit to contract for attestation.
- Use Wagmi for on-chain calls.

In `src/App.tsx`:
```tsx
import React, { useState } from 'react';
import Webcam from 'react-webcam';
import sha256 from 'js-sha256';
import { useContractWrite, usePrepareContractWrite } from 'wagmi';

const videoConstraints = { facingMode: 'user' };

function App() {
  const webcamRef = React.useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hash, setHash] = useState<string>('');

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      const photoHash = sha256(imageSrc); // Base64 to hash
      setHash(photoHash);
    }
  };

  const { config } = usePrepareContractWrite({
    address: 'YOUR_VERIFIER_ADDRESS',
    abi: [...], // ABI from contract
    functionName: 'verify_photo',
    args: [hash],
  });
  const { write } = useContractWrite(config);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <Webcam audio={false} height={720} ref={webcamRef} screenshotFormat="image/jpeg" width={1280} videoConstraints={videoConstraints} className="rounded-lg shadow-lg" />
      <button onClick={capture} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Capture Photo</button>
      {imgSrc && <img src={imgSrc} alt="Captured" className="mt-4 rounded-lg shadow-lg" />}
      {hash && <button onClick={() => write?.()} className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Verify On-Chain</button>}
    </div>
  );
}
```
- Style with Tailwind classes for responsive UI.
- Display attestation UID post-verification.

## 6. Testing
- Unit: `cargo test` for contracts.
- Integration: Use Wagmi in tests; simulate captures.
- E2E: Local node—capture photo, verify hash/timestamp.
- Benchmarks: Show Orbit TPS > mainnet; Stylus gas savings.

## 7. Deployment and Winning Submission
1. Deploy to Orbit Sepolia L3.
2. Host frontend on Vercel.
3. Demo: Video of live capture, hash, attestation query via EAS explorer.
4. Winning Tips: Add social sharing (on-chain identity), deepfake detection (hash comparison), GitHub tutorial. Highlight APAC relevance (e.g., verifiable journalism in India).
5. Submit: Repo, video, benchmarks.

Troubleshoot via Arbitrum Discord. This could win 1st—EAS + Stylus/Orbit is novel! If stuck, fork react-webcam examples.