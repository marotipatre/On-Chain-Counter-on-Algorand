import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { CounterFactory, CounterClient } from '../contracts/Counter'
import { OnSchemaBreak, OnUpdate } from '@algorandfoundation/algokit-utils/types/app'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

interface AppCallsInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const AppCalls = ({ openModal, setModalState }: AppCallsInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [deploying, setDeploying] = useState<boolean>(false)
  const [appId, setAppId] = useState<number | null>(null)
  const [currentCount, setCurrentCount] = useState<number>(0)
  const { enqueueSnackbar } = useSnackbar()
  const { activeAccount, activeAddress, transactionSigner: TransactionSigner } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({
    algodConfig,
    indexerConfig,
  })
  algorand.setDefaultSigner(TransactionSigner)

  // Separate function to fetch current count
  const fetchCount = async (appId: number): Promise<number> => {
    try {
      const counterClient = new CounterClient({
        appId: BigInt(appId),
        algorand,
        defaultSigner: TransactionSigner,
      })
      const state = await counterClient.appClient.getGlobalState()
      return typeof state.count.value === 'bigint' 
        ? Number(state.count.value) 
        : parseInt(state.count.value, 10)
    } catch (e) {
      enqueueSnackbar(`Error fetching count: ${(e as Error).message}`, { variant: 'error' })
      return 0
    }
  }

  const deployContract = async () => {
    setDeploying(true)
    try {
      const factory = new CounterFactory({
        defaultSender: activeAddress ?? undefined,
        algorand,
      })
      
      const deployResult = await factory.deploy({
        onSchemaBreak: OnSchemaBreak.AppendApp,
        onUpdate: OnUpdate.AppendApp,
      })

      const deployedAppId = Number(deployResult.appClient.appId)
      setAppId(deployedAppId)
      
      // Fetch and set initial count after deployment
      const count = await fetchCount(deployedAppId)
      setCurrentCount(count)
      
      enqueueSnackbar(`Contract deployed with App ID: ${deployedAppId}. Initial count: ${count}`, { 
        variant: 'success' 
      })
    } catch (e) {
      enqueueSnackbar(`Error deploying contract: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setDeploying(false)
    }
  }

  const incrementCounter = async () => {
    if (!appId) {
      enqueueSnackbar('Please deploy contract first', { variant: 'error' })
      return
    }

    setLoading(true)
    try {
      const counterClient = new CounterClient({
        appId: BigInt(appId),
        algorand,
        defaultSigner: TransactionSigner,
      })

      // Increment the counter
      await counterClient.send.incrCounter({args: [], sender: activeAddress ?? undefined})
      
      // Fetch and set updated count
      const count = await fetchCount(appId)
      setCurrentCount(count)
      
      enqueueSnackbar(`Counter incremented! New count: ${count}`, { 
        variant: 'success' 
      })
    } catch (e) {
      enqueueSnackbar(`Error incrementing counter: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog id="appcalls_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">Counter Contract</h3>
        <br />
        
        <div className="flex flex-col gap-4">
          {appId && (
            <div className="alert alert-info flex flex-col gap-1">
              <span>Current App ID: {appId}</span>
              <span>Current Count: {currentCount}</span>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <button 
              className={`btn btn-primary ${deploying ? 'loading' : ''}`}
              onClick={deployContract}
              disabled={deploying || loading}
            >
              {deploying ? 'Deploying...' : 'Deploy Contract'}
            </button>
            <p className="text-sm">Run this once to deploy the contract</p>
          </div>
          
          <div className="divider">OR</div>
          
          <div className="flex flex-col gap-2">
            <button 
              className={`btn btn-secondary ${loading ? 'loading' : ''}`}
              onClick={incrementCounter}
              disabled={loading || !appId}
            >
              {loading ? 'Processing...' : 'Increment Counter'}
            </button>
            <p className="text-sm">Requires deployed contract</p>
          </div>
          
          <div className="modal-action">
            <button 
              className="btn" 
              onClick={() => setModalState(false)}
              disabled={loading || deploying}
            >
              Close
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}

export default AppCalls