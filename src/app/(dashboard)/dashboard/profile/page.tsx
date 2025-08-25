'use client'

import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Passkeys } from "@/components/passkeys"

export default function ProfileSettings() {
    const { user } = useUser()

    return (
        <div className="container mx-auto space-y-4 p-2 sm:p-8 lg:space-y-8 xl:px-12 2xl:px-24">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and security preferences.
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                        {/*<div>*/}
                        {/*    <label className="text-sm font-medium">Username</label>*/}
                        {/*    <p className="text-sm text-muted-foreground">{user?.username}</p>*/}
                        {/*</div>*/}
                    </CardContent>
                </Card>

                {/*<Card>*/}
                {/*    <CardHeader>*/}
                {/*        <CardTitle>Security</CardTitle>*/}
                {/*    </CardHeader>*/}
                {/*    <CardContent>*/}
                {/*        <Passkeys />*/}
                {/*    </CardContent>*/}
                {/*</Card>*/}
            </div>
        </div>
    )
}