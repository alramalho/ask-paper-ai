import React, {useEffect, useRef, useState} from 'react';
import axios from 'axios';
import {Button, Input, Link, Loading, Spacer, styled, Text} from "@nextui-org/react";
import {Flex} from "./styles/flex";
import XIcon from "./icons/x-icon";
import CheckIcon from "./icons/check-icon";
import {Paper} from "../pages";
import {Box} from "./layout";
import useCustomSession from "../hooks/session";
import MarkdownView from "react-showdown";
import FileInput from "./input";
import UploadIcon from "./icons/upload-icon";

interface PaperUploaderProps {
  onFinish: (paper: Paper, pdf: File) => void
}

const PaperUploader = ({onFinish}: PaperUploaderProps) => {
  const [underText, setUnderText] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle')
  const [uploadedPaper, setUploadedPaper] = useState<Paper | undefined | null>(undefined)
  const [pdf, setPdf] = useState<File | undefined>(undefined)
  const [urlInput, setUrlInput] = useState<string | undefined>(undefined)
  const {data: session} = useCustomSession()

  useEffect(() => {
    if (uploadedPaper !== undefined && uploadedPaper !== null && pdf !== undefined) {
      onFinish(uploadedPaper, pdf)
    }
  }, [uploadedPaper])

  const handlePaperSubmit = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatus('uploading')
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }
    if (!file) return;
    if (file.size > 4_500_000) {
      setUnderText("Sorry! But currently we only support pdf up to 4.5MB.<br/> Please use a pdf compressor (<a target='_blank' href='https://www.ilovepdf.com/compress_pdf'>like this one</a>) before uploading 🙏<br/>")
      setStatus('error')
      return
    }
    const formData = new FormData();
    // notice that this 'name' must match the name of the field read in the backend
    formData.append('pdf_file', file);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_APIURL}/upload-paper`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Email': session!.user!.email,
          // @ts-ignore
          'Authorization': `Bearer ${session!.accessToken}`,
        },
      });
      if (res.data.title.length > 0) {
        setUnderText(`Selected \"${res.data.title}\"`)
      } else {
        setUnderText(`There was a problem reading the paper title. Everything should still work though!`)
      }
      setUploadedPaper(res.data as Paper)
      setPdf(file)
      setStatus('uploaded')
    } catch (error) {
      setUploadedPaper(null)
      setStatus('error')
      console.log(error);
    }
  }

  return (
    <Box css={{margin: '0 $3'}}>
      <Flex css={{gap: "$5"}} direction={'column'} >
        <FileInput
          id="paper-upload"
          type="file"
          onChange={handlePaperSubmit}
          accept="application/pdf"
        />

        <Flex css={{gap: "$2"}}>
          <Input
            type="url"
            style={{borderRadius: '10px 0 0 10px', width: '300px'}}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="Or paste an URL to a paper pdf"
          />
          <Button auto css={{}} onClick={() => {
            if (urlInput === undefined) {
              setUnderText("<i>Please enter a URL ❌</i>")
              return
            }
            fetch(urlInput)
              .then(response => response.blob())
              .then(blob => {
                handlePaperSubmit({
                  target: {
                    files: [new File(
                      [blob],
                      'paper.pdf',
                      {type: 'application/pdf'})
                    ]
                  }
                } as any)
              }).catch(e => {
                setStatus('error')
              setUnderText("Sorry! But we couldn't find a paper at that link.<br/> Please make sure the link is correct and try again.")
            })

          }
          }>
            <UploadIcon/>
          </Button>
        </Flex>

        {status == 'uploading' && <Loading data-testid="upload-loading"/>}
        {status == 'uploaded' && <CheckIcon data-testid="upload-successful"/>}
        {status == 'error' && <XIcon data-testid="upload-failed"/>}
      </Flex>
      <Spacer y={1}/>
      {underText &&
          <Box css={{maxWidth: '800px'}}>
              <MarkdownView
                  data-testid="upload-undertext"
                  markdown={underText}
                  options={{tables: false, emoji: true,}}
              />
          </Box>
      }
    </Box>
  );
}

export default PaperUploader;
