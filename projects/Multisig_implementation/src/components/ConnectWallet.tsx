import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { activeWalletAccounts, activeWalletAddresses, wallets } = useWallet()

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl">
            {activeWalletAddresses?.length ? 'Connected Accounts' : 'Connect Wallet'}
          </h3>
          <button onClick={closeModal} className="btn btn-sm btn-circle">✕</button>
        </div>

        <div className="space-y-4">
          {/* Connected Accounts Section */}
          {(activeWalletAccounts ?? []).length > 0 && (
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">Your Accounts</h4>
              <div className="space-y-3">
                {activeWalletAccounts?.map((account, index) => {
                  const wallet = wallets?.find(w => 
                    w.accounts.some(acc => acc.address === account.address)
                  )
                  
                  return (
                    <div 
                      key={`${account.name}-${account.address}`} 
                      className="flex justify-between items-center bg-base-100 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {wallet && !isKmd(wallet) && (
                          <img
                            src={wallet.metadata.icon}
                            alt={wallet.metadata.name}
                            className="w-5 h-5"
                          />
                        )}
                        <div>
                          <div className="text-sm font-mono truncate w-40">
                            {account.name || `Account ${index + 1}`}
                          </div>
                          <div className="text-xs opacity-70 font-mono truncate w-40">
                            {account.address}
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn btn-xs btn-error"
                        onClick={async (e) => {
                          e.preventDefault()
                          const walletToDisconnect = wallets?.find(w => 
                            w.accounts.some(acc => acc.address === account.address)
                          )
                          if (walletToDisconnect) {
                            await walletToDisconnect.disconnect()
                          }
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available Wallets Section */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">Available Wallets</h4>
            <div className="grid grid-cols-1 gap-2">
              {wallets?.map((wallet) => (
                <div key={`provider-${wallet.id}`} className="flex flex-col gap-2">
                  <button
                    data-test-id={`${wallet.id}-connect`}
                    className={`btn btn-outline justify-start ${wallet.isConnected ? 'btn-disabled opacity-50' : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      if (!wallet.isConnected) {
                        wallet.connect()
                      }
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
                  
                  {/* Additional accounts from same wallet */}
                  {wallet.isConnected && wallet.accounts.length > 1 && (
                    <div className="pl-2 space-y-1">
                      {wallet.accounts.map((account, idx) => (
                        <button
                          key={`additional-${account.address}`}
                          className="btn btn-xs btn-outline w-full justify-start"
                          onClick={(e) => {
                            e.preventDefault()
                            wallet.setActiveAccount(account.address)
                          }}
                        >
                          <span className="truncate text-xs">
                            {account.name || `Account ${idx + 1}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-action">
          {(activeWalletAccounts ?? []).length > 0 && (
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