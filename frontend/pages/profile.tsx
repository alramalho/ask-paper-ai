import { ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { GuestUserContext, useGuestSession } from "../hooks/session"
import { signOut, useSession } from "next-auth/react"
import { Flex } from "../components/styles/flex"
import { Loading, Spacer, Text } from "@nextui-org/react"
import Info from "../components/info"
import { loadDatasetsForUser } from "../service/service"
import { Avatar, Button, Table } from "antd"


const Profile = () => {
    const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
    const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
    const [userDatasets, setUserDatasets] = useState<string | undefined>(undefined)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const datasetsAsJson = useMemo(() => JSON.parse(userDatasets ?? "[]"), [userDatasets])

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
        <Flex direction='column' css={{ overflow: 'auto', alignItems: 'flex-start', padding: '1rem' }}>
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
                        : userDatasets != undefined ? <Table columns={generateColumnDefinitions(datasetsAsJson)} dataSource={datasetsAsJson.map((e, i) => ({ key: i, ...snakeCaseKeys(e) }))} scroll={{ x: 1500, y: 1500 }} /> : <Info>You have no datasets yet</Info>
                }
            </Flex>
        </Flex>
    </>)
}
interface KeyDefinition {
    title: string;
    dataIndex: string;
    key: string;
    width: number;
    render?: (value: any, record: object, index: number) => ReactNode | undefined
}


function generateColumnDefinitions(data: any[]): KeyDefinition[] {
    const keyDefinitions: KeyDefinition[] = [];

    data.forEach((item, index) => {
        Object.keys(item).forEach((key) => {
            const snakeCasedKey = key.replace(/ /g, '_').toLowerCase();
            if (!keyDefinitions.find((e) => e.title === key)) {
                const newElement: KeyDefinition = {
                    title: key,
                    dataIndex: snakeCasedKey,
                    width: 150,
                    key: 'irrelevant',
                }
                if (snakeCasedKey === 'link_to_data_or_code') {
                    newElement['render'] = (text, record, index) => text.startsWith("http") ? <a href={text} target="__blank">{text}</a> : text
                    
                }
                keyDefinitions.push(newElement)

            }
        });
    });

    keyDefinitions.map((keyDefinition, index) => {
        keyDefinition.key = index.toString();
    });

    return keyDefinitions;
}

function snakeCaseKeys(obj: any): any {
    const result: any = {};

    for (const key in obj) {
        const snakeCaseKey = key.replace(/ /g, '_').toLowerCase();
        result[snakeCaseKey] = obj[key];
    }

    return result;
}


export default Profile