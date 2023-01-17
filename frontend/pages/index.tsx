import { Text, Button, Card, Spacer, Loading, Input, Textarea, useInput } from "@nextui-org/react";
import { useEffect, useState } from "react";
import MarkdownView from "react-showdown";
import UploadIcon from "../components/icons/upload-icon";
import SendIcon from "../components/icons/send-icon";
import { Box } from "../components/layout";
import { Flex } from "../components/styles/flex";

type Paper = {
    abstract: string
    pdf_parse: {
        body_text: {
            text: string
            section: string
        }[],
        back_matter: {
            text: string
            section: string
        }[]
    }
}

const Temp = () => {
    const [LLMResponse, setLLMResponse] = useState<string | undefined>(undefined)
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [loadingText, setLoadingText] = useState<string | undefined>(undefined)
    const [selectedPaperName, setSelectedPaperName] = useState<string | undefined>(undefined)

    const [papers, setPapers] = useState<string[] | undefined>(undefined)
    const {
        value: questionValue,
        setValue: setQuestionValue,
        reset: resetQuestion,
        bindings,
    } = useInput("Type your question here...");


    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_APIURL}/get-papers`).then(response => response.json()).then(
            json => setPapers(json)
        )
    }, [])

    async function getPaper(path: string) {
        let paper: Paper = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_APIURL}/get-paper?path=${path}`).then(response => response.json());
        return paper
    }

    const handleSubmit = async (paperName: string, question: string, sectionFilterer: (sectionName:string) => boolean = (sectionName:string) => true) => {
        setSeconds(0)
        setIsRunning(true)
        setLoadingText("Reading paper...")
        const paperPath = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_APIURL}/parse-paper?name=${paperName}`).then(response => response.json())
        const paper = await getPaper(paperPath)

        const aggreggatedText = paper.abstract + paper.pdf_parse.body_text.concat(paper.pdf_parse.back_matter).filter(e => sectionFilterer(e.section)).map(bodyText => bodyText.text).join('\n')

        const datasetTable = await askPaper(question, aggreggatedText)
        setLLMResponse(makeLinksClickable(datasetTable))
        setIsRunning(false)
    }

    return <Flex justify="center" align="center" css={{ minHeight: '100%' }} direction="column">
        <h2>Ask Paper</h2>
        <Button icon={<UploadIcon />}>Upload your paper</Button>
        <Spacer y={3} />
        <h4>Or start with a template:</h4>
        {papers && <Flex css={{ gap: "$2" }}> {papers.map(paper => <Card
            isPressable
            isHoverable
            css={{ mw: "150px", mh: "200px", border: selectedPaperName === paper ? "1px solid blue" : undefined }}
            variant="bordered"
            onPress={() => setSelectedPaperName(paper)}
        >
            <Card.Body>
                <Text>{paper}</Text>
            </Card.Body>
        </Card>)}</Flex>}
        {selectedPaperName && <>
            <Spacer y={3} />
            <h4>And ask your question</h4>
            <Flex css={{ gap: "$5" }}>

                <Textarea
                    {...bindings}
                    fullWidth
                    size="lg"
                    minRows={4}
                    maxRows={20}
                    css={{ width: "400px", }}
                />
                <Button iconRight={<SendIcon />} onPress={() => handleSubmit(selectedPaperName, questionValue)} > Ask </Button>
            </Flex>
            <Spacer y={2} />
            <h4>Or start with predefined action:</h4>
            <Button
                css={{backgroundColor: "$purple300", color: "black"}}
                onPress={() => {
                    handleSubmit(
                        selectedPaperName, 
                        `Please summarize the following text on a markdown table. The text will contain possibly repeated information about the charactersitics of one or more datasets. I want you to summarize the whole text into a markdown table that represents the characterstics of all the datasets. The resulting table should be easy to read and contain any information that might be useful for medical researchers thinking about using any of those datasets. Some example fields would be "Name", "Size", "Demographic information", "Origin" and "Data or code link to find more", but add as many as you think are relevant for a medical researcher. The resulting table should contain as many entries as possible but it should NOT contain any duplicates (columns with the same "Name" field) and it should NOT contain any entries where the "Name" field is not defined/unknown/ not specified.`,
                        (e) => e.toLowerCase().includes('data'))
                    }}
            >
                <Text>Extract datasets</Text>
            </Button>
                    <Spacer y={4} />
                    <h3>Answer:</h3>
            {isRunning
                && <>
                    <Loading type="points">{loadingText}</Loading>
                </>
            }
            {LLMResponse &&
                <Box css={{ textAlign: 'left', margin: '$6' }}>
                    <MarkdownView
                        markdown={LLMResponse}
                        options={{ tables: true, emoji: true, }}
                    />
                </Box>
            }
        </>}

    </Flex>;
};

async function askPaper(question: string, context: string) {
    return (await fetch(`${process.env.NEXT_PUBLIC_BACKEND_APIURL}/ask`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: `Please answer the following request, denoted by "Request:" in the best way possible with the given context that bounded by "Start context" and "End context".\Request: ${question}\nStart context\n${context}\nEnd context`,
        })
    }).then(response => response.json()).catch(console.error)).message;
}

function makeLinksClickable(text: string) {
    return text.replace(/(https?:\/\/[^\s]+)/g, "<a target=\"__blank\" href='$1'>$1</a>");
}

export default Temp;