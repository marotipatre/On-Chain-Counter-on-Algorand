import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import { useEffect, useState } from 'react'

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

interface ConnectedWallet {
  id: string
  name: string
  addresses: string[]
  icon?: string
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeWallet } = useWallet()
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  // Sync connected wallets with active wallet state
  useEffect(() => {
    if (!wallets) return

    const updatedConnectedWallets = wallets
      .filter(wallet => wallet.isConnected)
      .map(wallet => ({
        id: wallet.id,
        name: isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name,
        addresses: wallet.accounts.map(acc => acc.address),
        icon: isKmd(wallet) ? undefined : wallet.metadata.icon
      }))

    setConnectedWallets(updatedConnectedWallets)
  }, [wallets, activeWallet])

  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl">
            {connectedWallets.length ? 'Connected Wallets' : 'Connect Wallet'}
          </h3>
          <button onClick={closeModal} className="btn btn-sm btn-circle">✕</button>
        </div>

        <div className="space-y-4">
          {/* Connected Wallets Section */}
          {connectedWallets.length > 0 && (
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">Your Wallets</h4>
              <div className="space-y-3">
                {connectedWallets.map((wallet) => (
                  <div key={wallet.id} className="bg-base-100 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {wallet.icon && (
                        <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />
                      )}
                      <span className="font-medium">{wallet.name}</span>
                    </div>
                    <div className="space-y-1">
                      {wallet.addresses.map(address => (
                        <div key={address} className="flex justify-between items-center">
                          <span className="text-sm font-mono truncate w-40">{address}</span>
                          <button
                            className="btn btn-xs btn-error"
                            onClick={async (e) => {
                              e.preventDefault()
                              const walletToDisconnect = wallets?.find(w => w.id === wallet.id)
                              if (walletToDisconnect) {
                                await walletToDisconnect.disconnect()
                              }
                            }}
                          >
                            Disconnect
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Wallets Section */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">Available Wallets</h4>
            <div className="grid grid-cols-1 gap-2">
              {wallets?.filter(w => !w.isConnected).map((wallet) => (
                <button
                  data-test-id={`${wallet.id}-connect`}
                  className="btn btn-outline justify-start"
                  key={`provider-${wallet.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    wallet.connect()
                  }}
                >
                  {!isKmd(wallet) && (
                    <img
                      alt={`wallet_icon_${wallet.id}`}
                      src={wallet.metadata.icon}
                      className="w-6 h-6 mr-2"
                    />
                  )}
                  <span className="truncate">
                    {isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-action">
          {connectedWallets.length > 0 && (
            <button
              className="btn btn-error btn-sm"
              data-test-id="logout-all"
              onClick={async (e) => {
                e.preventDefault()
                if (wallets) {
                  for (const wallet of wallets) {
                    if (wallet.isConnected) {
                      await wallet.disconnect()
                    }
                  }
                }
              }}
            >
              Disconnect All
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}

export default ConnectWallet