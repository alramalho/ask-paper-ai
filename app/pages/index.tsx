import {Details} from "../components/details";
import {NextPage} from "next";
import {useEffect, useState} from "react";
import {Layout} from "../components/layout";
import {Flex} from "../components/styles/flex";
import {Button, Loading, Radio, Spacer, Text} from "@nextui-org/react";

const Home: NextPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [papers, setPapers] = useState<string[] | undefined>(undefined)
  const [selectedPaper, setSelectedPaper] = useState<string | undefined>(undefined)
  const [response, setResponse] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_PDF2JSON_APIURL}/get-papers`).then(response => response.json()).then(
      json => setPapers(json)
    )
  }, [])

  const handleSubmit = () => {
    setIsLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_CHATGPT_APIURL}/extract-ds-from-paper?name=${selectedPaper}`)
      .then(res => res.json())
      .then(json => setResponse(json.response))
      .catch(e => {
        console.error(e);
        setResponse("Couldn't load response.")
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => console.log(selectedPaper), [selectedPaper])

  return (
    <Layout css={{flexDirection: 'column'}}>
      {papers ?
        <>
          <Radio.Group label="Options" onChange={setSelectedPaper}>
            {papers.map((elem, index) => <Radio key={elem} value={elem}>{elem}</Radio>)}
          </Radio.Group>
          <Spacer y={3}/>
          <Button color="gradient" onClick={handleSubmit}>Submit</Button>
        </>
        : "No papers"
      }
      {isLoading &&
          <Loading>Loading</Loading>
      }
      {response &&
          <Text>{response}</Text>
      }
    </Layout>
  )
}

export default Home
