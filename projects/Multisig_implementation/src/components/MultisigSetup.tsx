import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { 
  AlgoAmount, 
  getTransactionParams, 
  sendTransaction,
  microAlgos,
  MultisigAccount,
  Transaction
} from '@algorandfoundation/algokit-utils'

interface MultisigSetupProps {
  threshold: number
}

const MultisigSetup = ({ threshold }: MultisigSetupProps) => {
  const { wallets, activeAddress } = useWallet()
  const [multisigAccount, setMultisigAccount] = useState<MultisigAccount | null>(null)
  const [signers, setSigners] = useState<string[]>([])
  const [pendingTxns, setPendingTxns] = useState<{txn: Transaction; receiver: string; amount: number}[]>([])

  // Add a wallet as a signer
  const addSigner = (address: string) => {
    if (!signers.includes(address)) {
      setSigners([...signers, address])
    }
  }

  // Create the multisig account
  const createMultisigAccount = async () => {
    if (signers.length < threshold) {
      alert(`Need at least ${threshold} signers`)
      return
    }

    const account = new MultisigAccount({
      version: 1,
      threshold,
      addrs: signers
    })

    setMultisigAccount(account)
    return account
  }

  // Create and sign a transaction with the multisig account
  const createMultisigTransaction = async (receiver: string, amount: number) => {
    if (!multisigAccount) {
      alert('Create multisig account first')
      return
    }

    const suggestedParams = await getTransactionParams()

    const txn = multisigAccount.createTransaction({
      type: 'pay',
      from: multisigAccount.address,
      to: receiver,
      amount: microAlgos(amount),
      suggestedParams,
      note: 'Multisig transaction'
    })

    // For each signer, get their wallet to sign
    const signedTxns = await Promise.all(
      signers.map(async signerAddr => {
        const wallet = wallets.find(w => w.accounts.includes(signerAddr))
        if (!wallet) return null
        
        // Sign the transaction with the wallet
        const signedTxn = await wallet.signTransactions([txn.toByte()])
        return signedTxn[0]
      })
    ).then(results => results.filter(Boolean))

    if (signedTxns.length < threshold) {
      alert(`Not enough signatures (${signedTxns.length}/${threshold})`)
      return
    }

    // Combine signatures into a single multisig transaction
    const combinedTxn = multisigAccount.combineSignedTransactions(signedTxns)
    
    // Add to pending transactions (for UI) or submit immediately
    setPendingTxns([...pendingTxns, {
      txn: combinedTxn,
      receiver,
      amount
    }])
  }

  // Submit a pending transaction
  const submitTransaction = async (combinedTxn: Uint8Array) => {
    try {
      const result = await sendTransaction(combinedTxn)
      // Remove from pending
      setPendingTxns(pendingTxns.filter(t => t.txn !== combinedTxn))
      return result
    } catch (error) {
      console.error('Transaction failed', error)
      return null
    }
  }

  return (
    <div className="multisig-container">
      <h2>Multisig Wallet Setup</h2>
      
      <div className="signers-section">
        <h3>Connected Wallets</h3>
        {wallets.filter(w => w.isConnected).map(wallet => (
          <div key={wallet.id} className="wallet-item">
            <span>{wallet.metadata.name}</span>
            <span>{wallet.accounts[0]}</span>
            <button 
              onClick={() => addSigner(wallet.accounts[0])}
              disabled={signers.includes(wallet.accounts[0])}
            >
              Add as Signer
            </button>
          </div>
        ))}
      </div>

      <div className="multisig-section">
        <h3>Multisig Account</h3>
        <div>
          <p>Signers: {signers.length} (Threshold: {threshold})</p>
          <button onClick={createMultisigAccount} disabled={signers.length < threshold}>
            Create Multisig Account
          </button>
          {multisigAccount && (
            <div>
              <p>Multisig Address: {multisigAccount.address}</p>
              <button onClick={() => navigator.clipboard.writeText(multisigAccount.address)}>
                Copy Address
              </button>
            </div>
          )}
        </div>
      </div>

      {multisigAccount && (
        <div className="transaction-section">
          <h3>Create Transaction</h3>
          <div>
            <input type="text" placeholder="Receiver Address" id="receiver" />
            <input type="number" placeholder="Amount (microAlgos)" id="amount" />
            <button onClick={() => {
              const receiver = (document.getElementById('receiver') as HTMLInputElement).value
              const amount = parseInt((document.getElementById('amount') as HTMLInputElement).value)
              createMultisigTransaction(receiver, amount)
            }}>
              Create & Sign Transaction
            </button>
          </div>

          {pendingTxns.length > 0 && (
            <div className="pending-txns">
              <h4>Pending Transactions</h4>
              {pendingTxns.map((txn, index) => (
                <div key={index} className="pending-txn">
                  <p>To: {txn.receiver}</p>
                  <p>Amount: {AlgoAmount.fromMicroAlgos(txn.amount).algos} ALGO</p>
                  <button onClick={() => submitTransaction(txn.txn)}>
                    Submit Transaction
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MultisigSetup