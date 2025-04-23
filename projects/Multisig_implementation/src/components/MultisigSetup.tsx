import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import algosdk from 'algosdk'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface TransactInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const Transact = ({ openModal, setModalState }: TransactInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [receiverAddress, setReceiverAddress] = useState<string>('')

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig })

  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const { activeAddress, transactionSigner } = useWallet()

  const showTransactionOnAlgoExplorer = (txId: string) => {
    const explorerUrl = `https://lora.algokit.io/testnet/transaction/${txId}`
  
    // Use Snackbar with a clickable link
    enqueueSnackbar('Transaction completed!', {
      variant: 'success',
      action: (key) => (
        <button
          onClick={() => {
            window.open(explorerUrl, '_blank')
            // Optionally dismiss the snackbar
            closeSnackbar(key)
          }}
          style={{
            color: '#fff',
            textDecoration: 'underline',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          View on AlgoExplorer
        </button>
      ),
    })
  }
  const handleSubmitAlgo = async () => {
    setLoading(true)

    if (!receiverAddress) {
      enqueueSnackbar('Please enter receiver address', { variant: 'warning' })
      setLoading(false)
      return
    }

    try {
      enqueueSnackbar('Creating multisig with random accounts...', { variant: 'info' })

      // 1. Create random accounts
      const randomAccountA = algosdk.generateAccount()
      const randomAccountB = algosdk.generateAccount()
      const randomAccountC = algosdk.generateAccount()

      // 2. Create multisig account
      const multisigParams = {
        version: 1,
        threshold: 2,
        addrs: [
          randomAccountA.addr,
          randomAccountB.addr,
          randomAccountC.addr
        ]
      }

      const multisigAddr = algosdk.multisigAddress(multisigParams)

      // // funding from testnet dispenser - daily limit is 5 algos
      // // Fetch authToken from environment variables
      // const My_authToken = import.meta.env.VITE_ALGOKIT_DISPENSER_ACCESS_TOKEN
      // if (!My_authToken) {
      //   throw new Error('Auth token is missing. Please set VITE_ALGOKIT_DISPENSER_ACCESS_TOKEN in your .env file.')
      //       }


      // const testfundtx = await algorand.account.ensureFundedFromTestNetDispenserApi(multisigAddr, algorand.client.getTestNetDispenser({ authToken: My_authToken, requestTimeout: 15 }), algo(1))

      // if (testfundtx?.transactionId) {
      //   await algosdk.waitForConfirmation(algorand.client.algod, testfundtx.transactionId, 4)
      // } else {
      //   throw new Error('Transaction ID is undefined')
      // }

      // 3. Fund the multisig account (using your connected wallet)
      const fundTx = await algorand.send.payment({
        sender: activeAddress || '',
        receiver: multisigAddr,
        signer: transactionSigner,
        amount: algo(0.2),
        note: 'Funding multisig account',
      })

      // Wait for funding transaction to complete
      await algosdk.waitForConfirmation(algorand.client.algod, fundTx.txIds[0], 4)

      // 4. Create transaction from multisig
      const suggestedParams = await algorand.client.algod.getTransactionParams().do()

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: multisigAddr,
        receiver: receiverAddress,
        amount: algo(0.09).microAlgos,
        suggestedParams,
        note: new Uint8Array(Buffer.from('Multisig transaction from random accounts')),
      })

      // 5. Sign with required accounts (2 of 3)
      const signedTxn1 = algosdk.signMultisigTransaction(
        txn,
        multisigParams,
        randomAccountA.sk
      ).blob

      const signedTxn2 = algosdk.signMultisigTransaction(
        txn,
        multisigParams,
        randomAccountB.sk
      ).blob

      // 6. Combine and send
      const combinedTx = algosdk.mergeMultisigTransactions([signedTxn1, signedTxn2])
      const response = await algorand.client.algod.sendRawTransaction(combinedTx).do()
      const txId = response.txid

      // Wait for transaction confirmation
      await algosdk.waitForConfirmation(algorand.client.algod, txId, 4)

      // Show success message and transaction link
      enqueueSnackbar(`Multisig transaction successful!`, { variant: 'success' })
      showTransactionOnAlgoExplorer(txId)
      
      setReceiverAddress('')
    } catch (e) {
      console.error('Multisig error:', e)
      enqueueSnackbar(`Failed to create multisig: ${(e as Error).message}`, { variant: 'error' })
    }

    setLoading(false)
  }

  return (
    <dialog id="transact_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">Send Multisig Transaction</h3>
        <div className="py-4">
          <p className="text-sm mb-2">Using randomly generated multisig accounts</p>
          <input
            type="text"
            placeholder="Receiver address"
            className="input input-bordered w-full"
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
          />
        </div>
        <div className="modal-action">
          <button className="btn" onClick={() => setModalState(false)}>
            Close
          </button>
          <button
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={handleSubmitAlgo}
            disabled={loading || !receiverAddress}
          >
            {loading ? 'Processing...' : 'Send Transaction'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default Transact