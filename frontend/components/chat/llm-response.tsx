import { Button, Spacer, Image, Text } from "@nextui-org/react"
import { useSession } from "next-auth/react"
import { useContext, useMemo, useRef, useState } from "react"
import MarkdownView from "react-showdown"
import { GuestUserContext, useGuestSession } from "../../hooks/session"
import { Paper, Status } from "../../pages"
import { saveDatasets, sendAnswerEmail } from "../../service/service"
import { storeFeedback } from "../feedback-modal"
import { Box } from "../layout"
import { Flex } from "../styles/flex"
import { ChatMessage } from "./chat"
import { Button as AntButton, Dropdown, Space, notification } from "antd"
import { DownOutlined, FileTextOutlined, MailOutlined, SaveOutlined } from "@ant-design/icons"

export const RobotAnswer = ({ children, ...props }) => {
    return (
        <Flex css={{ margin: '$6', gap: "$5", flexWrap: 'nowrap', overflow: 'visible', justifyContent: 'flex-start', '*': { fontSize: "0.86rem" } }} {...props}>
            <Box css={{
                minWidth: "35px",
                maxWidth: "35px",
                alignSelf: 'end',
            }}>
                <Image src="hippo.svg" />
            </Box>
            <Box id="answer-area" data-testid="answer-area" css={{
                textAlign: 'left',
                backgroundColor: '$backgroundLighter',
                border: '1px solid $gray600',
                padding: '$4',
                borderRadius: '20px 20px 20px 0',
            }}>
                {children}
            </Box>
        </Flex>
    )
}

interface LLMResponseProps {
    selectedPaper: Paper
    chatHistory: ChatMessage[]
    text: string
    messageStatus: Status
}


const LLMResponse = ({ selectedPaper, chatHistory, text, messageStatus }: LLMResponseProps) => {
    const [underFeedbackText, setUnderFeedbackText] = useState<string | undefined>(undefined)
    const [emailStatus, setEmailStatus] = useState<Status>('idle')
    const [saveStatus, setSaveStatus] = useState<Status>('idle')
    const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
    const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()
    const [notificationApi, contextHolder] = notification.useNotification();


    const answerRef = useRef(null)

    const markdownTable = useMemo(() => extractMarkdownTable(text), [text])

    function handleExportClick({ key }) {
        if (key == 'csv') {
            downloadMarkdownTableAsCSV(markdownTable)
        } else if (key == 'json') {
            downloadMarkdownTableAsJSON(markdownTable)
        }
    }

    const question = useMemo(() => {
        function findPreviousMessage(messageContent: string, messages: ChatMessage[]): ChatMessage | undefined {
            const index = messages.findIndex(msg => msg.text === messageContent);
            if (index === -1) {
                return undefined;
            }

            const previousIndex = index - 1;
            if (previousIndex < 0) {
                return undefined;
            }

            return messages[previousIndex];
        }

        return findPreviousMessage(text, chatHistory)?.text ?? ""
    }, [chatHistory, text])

    return (<>
        {contextHolder}
        <RobotAnswer id="llm-response">
            <Box id="answer" ref={answerRef} css={{ padding: "$5" }}>
                <MarkdownView
                    markdown={text}
                    options={{ tables: true, emoji: true, }}
                />
            </Box>
            <Spacer y={1} />
            {messageStatus == 'success' &&

                <Flex direction="row" css={{ justifyContent: "space-between", gap: "$3" }}>
                    <Flex css={{ justifyContent: 'flex-start', gap: "$4" }}>
                        {markdownTable != null &&
                            <AntButton onClick={() => {
                                setSaveStatus('loading')
                                saveDatasets({
                                    paperTitle: selectedPaper!.title,
                                    datasets: markdownTableToJSON(markdownTable),
                                    email: session!.user!.email!,
                                    // @ts-ignore
                                    accessToken: session!.accessToken
                                }).then(() => {
                                    setSaveStatus('success')
                                    notificationApi['success']({
                                        message: 'Dashboard succesfully updated with the new datasets.',
                                    });
                                }).catch(() => {
                                    setSaveStatus('error')
                                    notificationApi['error']({
                                        message: 'There was an error saving the datasets. Please contact support.',
                                    });
                                })
                            }
                            }
                                icon={<SaveOutlined />}
                                loading={saveStatus == 'loading'}
                            >
                                Save
                            </AntButton>
                        }
                        <AntButton
                            icon={<MailOutlined />}
                            onClick={() => {
                                setEmailStatus('loading')
                                sendAnswerEmail({
                                    // @ts-ignore # todo: dafuq? Why is this comment needed
                                    email: session!.user!.email,
                                    question: question,
                                    // @ts-ignore
                                    answer: answerRef.current.innerHTML, // to keep the html format
                                    paperTitle: selectedPaper!.title
                                }).then(() => {
                                    setEmailStatus('success')
                                    setTimeout(() => {
                                        setEmailStatus('idle')
                                    }, 5000)
                                })
                                    .catch(() => setEmailStatus('error'))
                            }}
                        >
                            Email me this
                        </AntButton>
                        {markdownTable != null && <>
                            <Dropdown menu={{
                                items: [{
                                    label: 'CSV',
                                    key: 'csv',
                                    icon: <FileTextOutlined />,
                                },
                                {
                                    label: 'JSON',
                                    key: 'json',
                                    icon: <FileTextOutlined />,
                                }]
                                , onClick: handleExportClick
                            }}>
                                <AntButton data-testid="export-dropdown" >
                                    <Space>
                                        Export table as
                                        <DownOutlined />
                                    </Space>
                                </AntButton>
                            </Dropdown>
                        </>}
                        {emailStatus == 'loading' && <Text>Sending email...</Text>}
                        {emailStatus == 'success' &&
                            <Text data-testid="email-sent">Email sent! ✅</Text>}
                        {emailStatus == 'error' &&
                            <Text>There was an error ❌ Please contact support.</Text>}
                    </Flex>
                    <Flex css={{ gap: "$7" }}>
                        {<Text css={{ maxWidth: '400px', fontSize: "small", }}>{underFeedbackText ? underFeedbackText : "Was it accurate?"}</Text>}
                        <Button ghost auto color="success"
                            css={{
                                padding: '10px',
                                color: '"$success"',
                                '&:hover': { color: 'white', backgroundColor: '"$success"' },
                            }}
                            onPress={() => {
                                storeFeedback(session!.user!.email!, {
                                    email: session!.user!.email,
                                    was_answer_accurate: true,
                                    question: question,
                                    answer: text,
                                    paper_hash: selectedPaper?.hash ?? '',
                                    // @ts-ignore
                                }, session!.accessToken)
                                setUnderFeedbackText('Thank you! 🙏')
                            }}
                        >
                            👍
                        </Button>
                        <Button css={{ padding: '10px' }} ghost auto
                            onPress={() => {
                                storeFeedback(session!.user!.email!, {
                                    email: session!.user!.email,
                                    was_answer_accurate: false,
                                    question: question,
                                    answer: text,
                                    paper_hash: selectedPaper?.hash ?? '',
                                    // @ts-ignore
                                }, session!.accessToken)
                                setUnderFeedbackText('Thats unfortunate... Would you care to tell us more via the feedback form? 🙏')
                            }}
                        >
                            👎
                        </Button>
                    </Flex>
                </Flex>
            }
        </RobotAnswer>

    </>)
}

function extractMarkdownTable(text: string): string | null {
    const lines = text.split('\n');
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            if (startIndex === -1) {
                // A markdown table should at least have a header and a separator line
                if (lines.length > i + 1 && lines[i + 1].trim().match(/^\|(:?-+:?\|)+$/)) {
                    startIndex = i;
                }
            } else if (endIndex === -1 && !lines[i + 1]?.trim().startsWith('|')) {
                endIndex = i;
                break;
            }
        }
    }

    if (startIndex !== -1 && endIndex !== -1) {
        return lines.slice(startIndex, endIndex + 1).join('\n');
    }

    return null;
}

type TableJson = Record<string, string>[];

function downloadMarkdownTableAsCSV(markdownTable: string | null) {
    if (markdownTable === null) {
        console.warn("No table found to convert to CSV.");
        return;
    }

    // Remove leading/trailing whitespace and split the markdown table by rows
    const rows = markdownTable.trim().split('\n');

    // Process each row to extract the cells
    const csvRows = rows.map((row) => {
        // Remove leading/trailing '|' characters and split the row by '|'
        const cells = row.trim().slice(1, -1).split('|');

        // Process each cell to remove leading/trailing whitespace and handle special characters
        return cells.map((cell) => {
            // Remove leading/trailing whitespace and unescape special characters
            let processedCell = cell.trim().replace(/\\(.)/g, '$1');

            // If the cell contains a comma or newline, wrap it in double quotes
            if (processedCell.includes(',') || processedCell.includes('\n')) {
                processedCell = `"${processedCell}"`;
            }

            return processedCell;
        }).join(',');
    });

    // Create a CSV content string by joining the rows with newlines
    const csvContent = csvRows.join('\n');

    // Create a Blob object with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv' });

    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'table.csv';

    // Programmatically trigger the download
    document.body.appendChild(link);
    link.click();

    // Clean up the temporary anchor element
    document.body.removeChild(link);
}

function markdownTableToJSON(mdTable: string) {
    const lines = mdTable.split('\n').filter((_, i) => i !== 1); // Skip separator line
    const headers = lines[0].split('|').map(header => header.trim());
    const rows = lines.slice(1).map(line => line.split('|').map(cell => cell.trim()));

    const tableJson: TableJson = rows.map(row => {
        let rowObj: Record<string, string> = {};
        row.forEach((cell, index) => {
            if (headers[index]) rowObj[headers[index]] = cell;
        });
        return rowObj;
    });
    return tableJson
}
function downloadMarkdownTableAsJSON(mdTable: string | null): void {
    if (mdTable === null) {
        console.warn("No table found to convert to JSON.");
        return;
    }
    const tableJson = markdownTableToJSON(mdTable);

    const jsonString = JSON.stringify(tableJson, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'table.json';
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


export default LLMResponse