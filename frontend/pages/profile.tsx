import { useContext, useEffect, useState } from "react"
import { GuestUserContext, useGuestSession } from "../hooks/session"
import { useSession } from "next-auth/react"
import { Flex } from "../components/styles/flex"
import { Avatar, Button, Spacer, Text } from "@nextui-org/react"
import Info from "../components/info"
import MarkdownView from "react-showdown"
import { loadDatasetsForUser } from "../service/service"
import { makeLinksClickable } from "."

const Profile = () => {
    const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
    const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
    const [userDatasets, setUserDatasets] = useState<string | undefined>(undefined)

    useEffect(() => {
        // @ts-ignore 
        if (!session!.accessToken || !session!.user!.email) return
        // @ts-ignore 
        loadDatasetsForUser(session!.user!.email, session!.accessToken)
            .then(res => {
                console.log(res)
                console.log(res.data)
                setUserDatasets(res.data.datasets)
            })
    }, [session])

    return (<>
        <Flex direction='column'>
            <Flex css={{ gap: "$4" }}>
                <Avatar
                    size="lg"
                    src={session!.user!.image!}
                    color="warning"
                    bordered
                />
                <Text>{session!.user!.email}</Text>
            </Flex>
            <Spacer y={2} />
            <Flex direction='column' css={{margin: "$3"}}>
                <Text h4>📊 My Extracted Datasets</Text>
                {isUserLoggedInAsGuest
                    ? <Info>Login with discord to access your datasets</Info>
                    : <MarkdownView
                        markdown={makeLinksClickable(userDatasets ?? 'No datasets found') }
                        options={{ tables: true, emoji: true }}
                    />
                }
            </Flex>

            <Spacer y={2} />
            <Button as="a" css={{color: "black", borderColor: "black"}} bordered auto href={"/"}>← Go back to app</Button>
        </Flex>
    </>)
}
export default Profile