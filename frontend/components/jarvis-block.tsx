import { Collapse, Text } from "@nextui-org/react";

const JarvisBlock = (props) => {
    return (
        <Collapse.Group 
            bordered 
        >
            <Collapse
                title={<Text h4>Jarvis – Your human-level AI assistant (Ad)</Text>}
                subtitle="Jarvis is the next project of the AskPaper dev"
                contentLeft={
                    <img src="jarvis.png" height="50" style={{ margin: "1rem 0" }} alt="Jarvis"></img>
                }
            >
                <a href="https://heyjarvis.co">Click here</a> to go to the project page.
                <Text>20% off to the 20 first (use ASKPAPER code in checkout)</Text>
            </Collapse>
        </Collapse.Group>
    )
}

export default JarvisBlock;
