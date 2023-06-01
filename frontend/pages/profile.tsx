import { ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { GuestUserContext, useGuestSession } from "../hooks/session"
import { signOut, useSession } from "next-auth/react"
import { Flex } from "../components/styles/flex"
import { Loading, Spacer, Text } from "@nextui-org/react"
import Info from "../components/info"
import { loadDatasetsForUser, saveDatasets } from "../service/service"
import { Alert, Avatar, Button, Table, notification } from "antd"
import { DeleteFilled, DeleteOutlined } from "@ant-design/icons"
import { Status } from "./index"


type Change = {
    action: "delete" | "edit",
    record: any
}

const Profile = () => {
    const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
    const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
    const [userDatasets, setUserDatasets] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [pendingChanges, setPendingChanges] = useState<Change[]>([])
    const [saveStatus, setSaveStatus] = useState<Status>('idle')
    const [notificationApi, contextHolder] = notification.useNotification();

    const listedChanges = useMemo(() => {
        let result: Array<string> = []
        pendingChanges.forEach((change, index) => {
            result.push(`${change.action}d ${change.record.name}`)
        })
        return `(${result.join(", ")})`
    }, [pendingChanges])


    function refreshDatasets() {
        setIsLoading(true)
        // @ts-ignore 
        loadDatasetsForUser(session!.user!.email, session!.accessToken)
            .then(res => {
                const datasets = JSON.parse(res.data.datasets)
                console.log(datasets)
                if (datasets == undefined || datasets == null) {
                    setUserDatasets([])
                } else {
                    setUserDatasets(datasets)
                }
                setIsLoading(false)
            })
            .catch(err => {
                console.log(err)
                setIsLoading(false)
                notificationApi['error']({
                    message: 'There was an error loading your datasets. Please contact support.',
                });
            })
    }

    useEffect(() => {
        // @ts-ignore 
        if (!session!.accessToken || !session!.user!.email) return
        refreshDatasets()
    }, [session])

    useEffect(() => {
        if (pendingChanges.length == 1) {
            notificationApi['info']({
                message: "Don't forget to save your changes before leaving!",
            });
        }
    }, [pendingChanges])


    function deleteRecord(record: any) {
        const indexToBeDeleted = userDatasets.findIndex((e: any) => e == record)
        if (indexToBeDeleted == -1) {
            notificationApi['error']({
                message: "Something went wrong, please try again later",
            });
            return
        }
        setUserDatasets(datasets => datasets.filter((e, i) => i != indexToBeDeleted))
        setPendingChanges(changes => [...changes, { action: "delete", record: record }])
    }

    function saveChanges() {
        setSaveStatus('loading')
        saveDatasets({
            email: session!.user!.email!,
            // @ts-ignore
            accessToken: session!.accessToken,
            datasets: userDatasets,
            changes: pendingChanges
        }).then(() => {
            setSaveStatus('success')
            setPendingChanges([])
            refreshDatasets()
            notificationApi['success']({
                message: 'Your changes were succesfully saved 🚀',
            });
        }).catch(() => {
            setSaveStatus('error')
            notificationApi['error']({
                message: 'There was an error saving the datasets. Please contact support.',
            });
        })

    }

    function generateColumnDefinitions(data: any[]): KeyDefinition[] {
        const keyDefinitions: KeyDefinition[] = [];

        data.forEach((item, index) => {
            Object.keys(item).forEach((key) => {
                if (!keyDefinitions.find((e) => e.title === key)) {
                    const newElement: KeyDefinition = {
                        title: key,
                        dataIndex: key,
                        key: key,
                    }
                    if (key.toLowerCase() === 'name') {
                        newElement['fixed'] = 'left'
                    }
                    if (key.toLowerCase() === 'link to data or code') {
                        newElement['render'] = (text, record, index) => text.startsWith("http") ? <a href={text} target="__blank">{text}</a> : text
                    }
                    keyDefinitions.push(newElement)

                }
            });
        });

        const nameIndex = keyDefinitions.findIndex((e) => e.title.toLowerCase() === 'name')
        const nameColumn = keyDefinitions[nameIndex]
        keyDefinitions.splice(nameIndex, 1)
        keyDefinitions.unshift(nameColumn)

        keyDefinitions.push({
            title: 'Delete',
            key: 'delete',
            fixed: 'right',
            width: 100,
            render: (text, record, index) => <Button onClick={() => deleteRecord(record)} icon={<DeleteOutlined />}>Delete</Button>,
        })

        console.log(keyDefinitions)
        return keyDefinitions;
    }

    return (<>
        {contextHolder}
        <Flex direction='column' css={{ alignItems: 'flex-start', padding: '1rem' }}>
            <Flex css={{ gap: "$4" }}>
                <Avatar
                    size="large"
                    src={<img src={session!.user!.image ?? undefined} alt={session!.user!.name!} />}
                />
                <Text>{session!.user!.email}</Text>
                <Button onClick={() => signOut()}>Log out</Button>
            </Flex>
            <Spacer y={2} />
            <Flex direction='column' css={{ margin: "$3", alignItems: 'flex-start', maxWidth: "100%" }} data-testid="profile-dataset-area">
                <Text h4>📊 My Extracted Datasets</Text>
                {pendingChanges.length > 0 &&
                    <Alert
                        style={{ marginBottom: "2rem" }}
                        message="You have pending changes!"
                        description={`If you leave this page without saving, your changes will be lost. Click on 'Save Changes' to save your changes. ${listedChanges}`}
                        type="info"
                        action={
                            <Button style={{ backgroundColor: "#1677ff" }} type="primary" loading={saveStatus == 'loading'} onClick={saveChanges}>
                                Save Changes
                            </Button>
                        }
                    />
                }
                {isUserLoggedInAsGuest
                    ? <Info>This feature is only available to Community Members</Info>
                    : isLoading
                        ? <Loading >Loading your datasets</Loading>
                        // @ts-ignore –> this should be not needed, but typescript is complaining
                        : userDatasets == undefined || userDatasets == null || userDatasets.length == 0
                            ? <Info>You have no datasets yet</Info>
                            : <Table
                                style={{ maxWidth: "100%", fontSize: "small" }}
                                size="small"
                                pagination={false}
                                columns={generateColumnDefinitions(userDatasets)}
                                dataSource={userDatasets}
                                scroll={{ x: 1500, y: 800 }}
                            />
                }
            </Flex>
        </Flex>
    </>)
}
interface KeyDefinition {
    title: string;
    key: string;
    width?: number;
    dataIndex?: string;
    fixed?: 'right' | 'left';
    render?: (value: any, record: object, index: number) => ReactNode | undefined
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