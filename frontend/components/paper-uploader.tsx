import React, {useEffect, useRef, useState} from 'react';
import axios from 'axios';
import {Button, styled} from "@nextui-org/react";
import UploadIcon from "./icons/upload-icon";
import {Flex} from "./styles/flex";
import XIcon from "./icons/x-icon";
import CheckIcon from "./icons/check-icon";
import {Paper} from "../pages";

const Label = styled('label')
const Input = styled('input')

interface PdfUploaderProps {
  onFinish: (paper: Paper) => void
}

const PaperUploader = ({onFinish}: PdfUploaderProps) => {

  const [uploadedPaper, setUploadedPaper] = useState<Paper | undefined | null>(undefined)
  const labelEl = useRef(null)

  useEffect(() => {
    if (uploadedPaper !== undefined && uploadedPaper !== null) {
      onFinish(uploadedPaper)
    }
  }, [uploadedPaper])

  const handlePaperSubmit = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadedPaper(res.data.paper)
      console.log(res);
    } catch (error) {
      setUploadedPaper(null)
      console.log(error);
    }
  }

  return (
    <Flex css={{gap: "$5"}}>
      <Input css={{display: 'none'}} id="paper-upload" type="file" onChange={handlePaperSubmit}
             accept="application/pdf"/>
      <Label htmlFor="paper-upload" ref={labelEl}>
        <Button onPress={(e) => {
          // @ts-ignore
          labelEl.current!.click()
        }} icon={<UploadIcon/>}>Upload your paper</Button>
      </Label>
      {uploadedPaper != undefined
        ? uploadedPaper != null
          ? <CheckIcon/>
          : <XIcon/>
        : null
      }
    </Flex>
  );
}

export default PaperUploader;
