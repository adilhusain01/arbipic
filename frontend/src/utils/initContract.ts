// Contract initialization utility
import { writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '../config'
import { VERIFIER_ABI, VERIFIER_ADDRESS } from '../config'

/**
 * Initialize the contract after deployment
 * This should be called ONCE by the contract deployer
 */
export async function initializeContract() {
  try {
    console.log('Initializing contract...')
    
    const hash = await writeContract(config, {
      address: VERIFIER_ADDRESS,
      abi: VERIFIER_ABI,
      functionName: 'init',
      args: [],
    })

    console.log('Initialization transaction sent:', hash)

    const receipt = await waitForTransactionReceipt(config, { hash })
    
    console.log('Contract initialized successfully!', receipt)
    return receipt
  } catch (error) {
    console.error('Failed to initialize contract:', error)
    throw error
  }
}
