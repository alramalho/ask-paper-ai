import { useContext, useEffect, useState } from "react"
import { GuestUserContext, useGuestSession } from "../hooks/session"
import { signOut, useSession } from "next-auth/react"
import { Flex } from "../components/styles/flex"
import { Loading, Spacer, Text, styled } from "@nextui-org/react"
import Info from "../components/info"
import MarkdownView from "react-showdown"
import { loadDatasetsForUser } from "../service/service"
import { makeLinksClickable } from "."
import Link from "next/link"
import { Avatar, Button } from "antd"


const Div = styled('div', {
    width: '100vw',
    height: '100vh',
    overflow: 'scroll',
})

const Profile = () => {
    const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
    const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
    const [userDatasets, setUserDatasets] = useState<string | undefined>(undefined)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    useEffect(() => {
        setIsLoading(true)
        // @ts-ignore 
        if (!session!.accessToken || !session!.user!.email) return
        // @ts-ignore 
        loadDatasetsForUser(session!.user!.email, session!.accessToken)
            .then(res => {
                setUserDatasets(res.data.datasets)
                setIsLoading(false)
            })
    }, [session])

    return (<>
        <Flex direction='column' css={{ overflow: 'scroll', alignItems: 'flex-start', padding: '1rem' }}>
            <Flex css={{ gap: "$4" }}>
                <Avatar
                    size="large"
                    src={<img src={session!.user!.image ?? undefined} alt={session!.user!.name!} />}
                />
                <Text>{session!.user!.email}</Text>
                <Button onClick={() => signOut()}>Log out</Button>
            </Flex>
            <Spacer y={2} />
            <Flex direction='column' css={{ margin: "$3", alignItems: 'flex-start' }} data-testid="profile-dataset-area">
                <Text h4>📊 My Extracted Datasets</Text>
                {isUserLoggedInAsGuest
                    ? <Info>This feature is only available to Community Members</Info>
                    : isLoading
                        ? <Loading >Loading your datasets</Loading>
                        : <MarkdownView
                            markdown={makeLinksClickable(userDatasets ?? 'No datasets found.')}
                            options={{ tables: true, emoji: true }}
                        />
                }
            </Flex>
        </Flex>
    </>)
}
export default Profile