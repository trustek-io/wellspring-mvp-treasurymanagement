"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { useWallets } from "@/providers/wallet-provider"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LogOutIcon,
  PlusCircleIcon,
  SettingsIcon,
  User,
  Copy,
} from "lucide-react"
import Jazzicon, { jsNumberForAddress } from "react-jazzicon"
import { formatEther } from "viem"
import { toast } from "sonner"

import { truncateAddress } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Skeleton } from "./ui/skeleton"
import {useZeroDev} from '@/providers/zerodev-provider'

function AccountAvatar({ address }: { address: string | undefined }) {
  return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
        <User className="h-4 w-4 text-gray-600" />
      </div>
  )
}

export default function Account() {
  const router = useRouter()
  const { logout } = useAuth()
  const { user } = useUser()
  const { state, newWallet, newWalletAccount, selectWallet, selectAccount } =
      useWallets()
  const { selectedWallet, selectedAccount, wallets } = state

  const [isOpen, setIsOpen] = useState(false)
  const [isNewWalletMode, setIsNewWalletMode] = useState(false)
  const [newWalletName, setNewWalletName] = useState("")
  const { state: zeroDevState } = useZeroDev()
  const smartAddress = zeroDevState.smartAccountInfo?.address as `0x${string}` ?? ''

  const handleNewWallet = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    setIsNewWalletMode(true)
  }

  const handleNewAccount = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    newWalletAccount()
  }

  const handleCreateWallet = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        newWallet(newWalletName)
        setIsNewWalletMode(false)
        setNewWalletName("")
      },
      [newWalletName, newWallet]
  )

  const handleLogout = () => {
    logout()
  }

  const handleCopyAddress = (address: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(address)
    toast.success("Address copied to clipboard")
  }

  useEffect(() => {
    setTimeout(() => {
      setIsNewWalletMode(false)
    }, 100)
  }, [isOpen])

  return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger className="dark" asChild>
          <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-gray-100"
          >
            <AccountAvatar address={selectedAccount?.address} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
            align="end"
            className=" w-80 bg-background text-foreground"
        >
          <DropdownMenuLabel className="dark flex w-full items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex flex-col">
              <span className=" font-semibold"> {user?.email || ""}</span>
              {/*  <span className="text-xs text-muted-foreground">*/}
              {/*  {user?.email || ""}*/}
              {/*</span>*/}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />
          {/*<DropdownMenuLabel className="">*/}
          {/*  <span>Wallets</span>*/}
          {/*</DropdownMenuLabel>*/}
          {/*{wallets.map((wallet) => (*/}
          {/*    <DropdownMenuCheckboxItem*/}
          {/*        key={wallet.walletId}*/}
          {/*        checked={selectedWallet?.walletId === wallet.walletId}*/}
          {/*        onCheckedChange={() => selectWallet(wallet)}*/}
          {/*        onKeyDown={(e) => e.stopPropagation()} // Prevent dropdown menu from handling key events*/}
          {/*        className="flex items-center py-2"*/}
          {/*    >*/}
          {/*      {wallet.walletName}*/}
          {/*    </DropdownMenuCheckboxItem>*/}
          {/*))}*/}

          {/*{isNewWalletMode ? (*/}
          {/*    <div className="space-y-2 px-2 py-1.5">*/}
          {/*      <input*/}
          {/*          autoFocus*/}
          {/*          type="text"*/}
          {/*          placeholder="Enter wallet name"*/}
          {/*          value={newWalletName}*/}
          {/*          onChange={(e) => setNewWalletName(e.target.value)}*/}
          {/*          onKeyDown={(e) => e.stopPropagation()} // Prevent dropdown menu from handling key events*/}
          {/*          className="w-full bg-transparent px-0 py-1 text-sm text-foreground placeholder-muted-foreground focus:outline-none"*/}
          {/*      />*/}
          {/*      <Button*/}
          {/*          disabled={!newWalletName}*/}
          {/*          onClick={handleCreateWallet}*/}
          {/*          variant="outline"*/}
          {/*          className="w-full text-sm"*/}
          {/*      >*/}
          {/*        Create*/}
          {/*      </Button>*/}
          {/*    </div>*/}
          {/*) : (*/}
          {/*    <DropdownMenuItem onSelect={handleNewWallet}>*/}
          {/*      <PlusCircleIcon className="mr-2 h-4 w-4" />*/}
          {/*      <span>New Wallet</span>*/}
          {/*    </DropdownMenuItem>*/}
          {/*)}*/}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2">
            <span>Accounts</span>
          </DropdownMenuLabel>

          {selectedWallet?.accounts.map((account) => (
              <DropdownMenuCheckboxItem
                  key={account.address}
                  checked={selectedAccount?.address === account.address}
                  onCheckedChange={() => selectAccount(account)}
                  className="flex items-center justify-between py-2"
              >
            <span>
              {account.address ? truncateAddress(smartAddress) : ""}
            </span>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    onClick={(e) => handleCopyAddress(smartAddress, e)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </DropdownMenuCheckboxItem>
          ))}

          {/*<DropdownMenuItem onSelect={handleNewAccount}>*/}
          {/*  <PlusCircleIcon className="mr-2 h-4 w-4" />*/}
          {/*  <span>New Account</span>*/}
          {/*</DropdownMenuItem>*/}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOutIcon className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  )
}