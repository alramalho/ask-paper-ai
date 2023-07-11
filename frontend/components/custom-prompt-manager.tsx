import { DeleteOutlined } from "@ant-design/icons"
import { Button, Divider, Input, Modal, notification } from "antd"
import { useSession } from "next-auth/react"
import { useContext, useEffect, useState } from "react"
import { GuestUserContext, useGuestSession } from "../hooks/session"
import { CustomPrompt, Status } from "../pages"
import { deleteCustomPrompt, loadCustomPrompts, saveCustomPrompt } from "../service/service"

const { TextArea } = Input

interface CustomPromptCreatorProps {
    isVisible: boolean
    setIsVisible: (isVisible: boolean) => void
    customPrompts: CustomPrompt[]
    setCustomPrompts: (customPrompts: CustomPrompt[]) => void
}

const CustomPromptManager = ({ isVisible, setIsVisible, customPrompts, setCustomPrompts }: CustomPromptCreatorProps) => {
    const [status, setStatus] = useState<Status>('idle')
    const [newPrompt, setNewPrompt] = useState<string>("")
    const [newPromptTitle, setNewPromptTitle] = useState<string>("")
    const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
    const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
    const [notificationApi, contextHolder] = notification.useNotification();

    const loadPrompts = () => {
        // @ts-ignore
        loadCustomPrompts(session!.user!.email, session!.accessToken)
            .then(res => {
                setCustomPrompts(res.data)
            })
            .catch(err => {
                notificationApi['error']({
                    message: 'Something went wrong while loading your custom prompts. Please try again later.',
                });
            })
    }

    useEffect(() => {
        if (!isUserLoggedInAsGuest) {
            loadPrompts()
        }
    }, [])

    function handleOk() {
        if (newPrompt !== "" && newPromptTitle !== "") {
            setStatus('loading')
            // @ts-ignore
            saveCustomPrompt(newPromptTitle, newPrompt, session!.user!.email, session!.accessToken)
                .then(data => {
                    setIsVisible(false)
                    setStatus('success')
                    notificationApi['success']({
                        message: 'Prompt saved!',
                    });
                    loadPrompts()
                })
                .catch(err => {
                    setStatus('error')
                    notificationApi['error']({
                        message: 'Something went wrong while saving your prompt. Please try again later.',
                    });
                })
        } else {
            notificationApi['error']({
                message: 'Please enter a title and a prompt text.',
            });
        }
    }

    function handlePromptDelete(title: string) {
        notificationApi['info']({
            message: 'Deleting prompt...',
        });
        // @ts-ignore
        deleteCustomPrompt(title, session!.user!.email, session!.accessToken)
            .then(data => {
                notificationApi['success']({
                    message: 'Prompt deleted!',
                });
                loadPrompts()
            })
            .catch(err => {
                notificationApi['error']({
                    message: 'Something went wrong while deleting your prompt. Please try again later.',
                });
            })
    }



    return (<>
        {contextHolder}
        <Modal
            closable={false}
            title="Creating prompt"
            open={isVisible}
            footer={[
                <Button key="back" onClick={() => setIsVisible(false)}>
                    Cancel
                </Button>,
                <Button data-testid="create-button" key="save" type="primary" loading={status == 'loading'} onClick={handleOk}>
                    Create new
                </Button>,
            ]}
        >
            {customPrompts && customPrompts.length === 0 && <p>You have no custom prompts yet. Create one below!</p>}
            {customPrompts && customPrompts.length > 0 && <>
                <h3 style={{ fontSize: '1.1rem' }}>Your Existing prompts 👇</h3>
                {customPrompts.map(prompt => <>
                    <h4 style={{ marginTop: "1rem" }}>{prompt.title}</h4>
                    <p>{prompt.prompt}</p>
                    <Button onClick={() => handlePromptDelete(prompt.title)} icon={<DeleteOutlined />}>Delete</Button>
                </>)}
                <Divider />
            </>}

            <h3 style={{ fontSize: '1.1rem' }}>Create a new prompt 👇</h3>
            <h4>Title</h4>
            <Input data-testid="title-input" value={newPromptTitle} onChange={(e) => setNewPromptTitle(e.target.value)} />

            <h4>Text</h4>
            <TextArea data-testid="text-input" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} rows={4} />
        </Modal >
    </>)
}

export default CustomPromptManager