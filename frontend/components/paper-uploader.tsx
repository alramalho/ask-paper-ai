import React, {useEffect, useRef, useState} from 'react';
import axios from 'axios';
import {Button, Loading, Spacer, styled, Text} from "@nextui-org/react";
import UploadIcon from "./icons/upload-icon";
import {Flex} from "./styles/flex";
import XIcon from "./icons/x-icon";
import CheckIcon from "./icons/check-icon";
import {Paper} from "../pages";
import {Box} from "./layout";

const Label = styled('label')
const Input = styled('input')

interface PaperUploaderProps {
  onFinish: (paper: Paper) => void
}

const PaperUploader = ({onFinish}: PaperUploaderProps) => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle')
  const [uploadedPaper, setUploadedPaper] = useState<Paper | undefined | null>(undefined)
  const labelEl = useRef(null)

  useEffect(() => {
    console.log("Uploaded paper changed to:")
    console.log(uploadedPaper)
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
    const formData = new FormData();
    // notice that this 'name' must match the name of the field read in the backend
    formData.append('pdf_file', file);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_APIURL || 'http://localhost:8080'}/upload-paper`, formData, {
        headers: {'Content-Type': 'multipart/form-data'},
      });
      setUploadedPaper(res.data as Paper)
      setStatus('uploaded')
      console.log(res);
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
          <Button onPress={(e) => {
            // @ts-ignore
            labelEl.current!.click()
          }} icon={<UploadIcon/>}>Upload your paper</Button>
        </Label>
        {status == 'uploading' && <Loading/>}
        {status == 'uploaded' && <CheckIcon/>}
        {status == 'error' && <XIcon/>}
      </Flex>
      <Spacer y={1}/>
      {uploadedPaper && (uploadedPaper.title.length > 0
      ? <Text>Selected "{uploadedPaper.title}"</Text>
          : <Text i>Couldn't properly read paper title. Results might be flawed.</Text>
      )}
    </Box>
  );
}

export default PaperUploader;
