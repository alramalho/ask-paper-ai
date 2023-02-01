import React, {useEffect, useRef, useState} from 'react';
import axios from 'axios';
import {Button, Loading, Spacer, styled, Text} from "@nextui-org/react";
import UploadIcon from "./icons/upload-icon";
import {Flex} from "./styles/flex";
import XIcon from "./icons/x-icon";
import CheckIcon from "./icons/check-icon";
import {Paper} from "../pages";
import {Box} from "./layout";
import {PressEvent} from "@react-types/shared";
import {useSession} from "next-auth/react";

const Label = styled('label')
const Input = styled('input')

interface PaperUploaderProps {
  onFinish: (paper: Paper) => void
}

const PaperUploader = ({onFinish}: PaperUploaderProps) => {
  const [underText, setUnderText] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle')
  const [uploadedPaper, setUploadedPaper] = useState<Paper | undefined | null>(undefined)
  const labelEl = useRef(null)
  const {data: session} = useSession()

  useEffect(() => {
    if (uploadedPaper !== undefined && uploadedPaper !== null) {
      onFinish(uploadedPaper)
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
    if (file.size > 6_000_000) {
      setUnderText("Sorry! But currently we only support file up to 6MB. Please compress it before uploading it 🙏")
      setStatus('error')
      return
    }
    const formData = new FormData();
    // notice that this 'name' must match the name of the field read in the backend
    formData.append('pdf_file', file);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_APIURL || 'http://localhost:8080'}/upload-paper`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
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
      setStatus('uploaded')
    } catch (error) {
      setUploadedPaper(null)
      setStatus('error')
      console.log(error);
    }
  }

  return (
    <Box css={{margin: '0 $3'}}>
      <Flex css={{gap: "$5"}}>
        <Input css={{display: 'none'}} id="paper-upload" type="file" onChange={handlePaperSubmit}
               accept="application/pdf"/>
        <Label htmlFor="paper-upload" ref={labelEl}>
          <Button onPress={(e: PressEvent) => {
            // @ts-ignore
            labelEl.current!.click()
          }} icon={<UploadIcon/>}>Upload your paper</Button>
        </Label>
        {status == 'uploading' && <Loading/>}
        {status == 'uploaded' && <CheckIcon/>}
        {status == 'error' && <XIcon/>}
      </Flex>
      <Spacer y={1}/>
      {underText &&
          <Text>{underText}</Text>
      }
    </Box>
  );
}

export default PaperUploader;
