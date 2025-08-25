
// Helper function to get the signer from ZeroDev provider
export async function getSignerFromZeroDevProvider(
    user: any,
    walletState: any,
    client: any
) {
    const { getTurnkeySignerForZeroDev } = await import("@/lib/web3")

    if (!user) {
        throw new Error("No user available")
    }

    if (!walletState.selectedWallet) {
        throw new Error("No wallet selected")
    }

    if (!walletState.selectedAccount) {
        throw new Error("No account selected")
    }

    if (!client) {
        throw new Error("No Turnkey client available")
    }

    const turnkeySigner = await getTurnkeySignerForZeroDev(
        // @ts-ignore
        client,
        walletState.selectedAccount.address,
        user.organization.organizationId
    )

    return turnkeySigner
}