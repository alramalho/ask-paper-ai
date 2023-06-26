import { UploadOutlined } from '@ant-design/icons';
import { Loading, Spacer } from "@nextui-org/react";
import { Button, Card, Divider, Input, Space } from 'antd';
import { useSession } from 'next-auth/react';
import React, { useContext, useEffect, useState } from 'react';
import MarkdownView from "react-showdown";
import { GuestUserContext, useGuestSession } from "../hooks/session";
import { Paper } from "../pages";
import { uploadPaper } from "../service/service";
import CheckIcon from "./icons/check-icon";
import XIcon from "./icons/x-icon";
import FileInput, { MinimalFileInput } from "./input";
import { Box } from "./layout";
import { Flex } from "./styles/flex";

interface PaperUploaderProps {
  onFinish: (paper: Paper, pdf: File) => void
  alternative?: boolean
}

const PaperUploader = ({ onFinish, alternative }: PaperUploaderProps) => {
  const [underText, setUnderText] = useState<string | undefined>(undefined)
  const [errorText, setErrorText] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle')
  const [uploadedPaper, setUploadedPaper] = useState<Paper | undefined | null>(undefined)
  const [pdf, setPdf] = useState<File | undefined>(undefined)
  const [urlInput, setUrlInput] = useState<string | undefined>(undefined)
  const { isUserLoggedInAsGuest } = useContext(GuestUserContext)
  const { data: session } = isUserLoggedInAsGuest ? useGuestSession() : useSession()

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
      setStatus('error')
      setErrorText("Sorry! But currently we only support pdf up to 4.5MB.<br/> Please use a pdf compressor (<a target='_blank' href='https://www.ilovepdf.com/compress_pdf'>like this one</a>) before uploading 🙏<br/>")
      return
    }
    const formData = new FormData();
    // notice that this 'name' must match the name of the field read in the backend
    formData.append('pdf_file', file);
    try {
      // @ts-ignore
      const res = await uploadPaper(session!.accessToken, session!.user!.email, formData)
      setUploadedPaper(res.data as Paper)
      setPdf(file)
      setStatus('uploaded')
    } catch (error) {
      setUploadedPaper(null)
      setStatus('error')
      setErrorText("Something went wrong! Please try again later or open a support request. 🙏")
      console.log(error);
    }
  }

  function fetchPaperUrl(paperUrl: string) {
    setStatus('uploading')
    fetch(paperUrl)
      .then(response => response.blob())
      .then(blob => {
        handlePaperSubmit({
          target: {
            files: [new File(
              [blob],
              'paper.pdf',
              { type: 'application/pdf' })
            ]
          }
        } as any)
      }).catch(e => {
        setStatus('error')
        setErrorText("Sorry! But we couldn't find a paper at that link.<br/> Please make sure the link is correct and try again.")
      })
  }

  return (
    <Box css={{ margin: '0 $3', textAlign: "center" }}>
      <Flex css={{ gap: "$5" }} direction={alternative ? 'row' : 'column'}>
        {alternative
          ? <MinimalFileInput
            id="paper-upload"
            type="file"
            onChange={handlePaperSubmit}
            accept="application/pdf"
          />
          : <FileInput
            id="paper-upload"
            type="file"
            onChange={handlePaperSubmit}
            accept="application/pdf"
          />
        }

        <Space.Compact size="large">
          <Input
            data-testid={'upload-url-input'}
            type="url"
            style={{ borderRadius: '10px 0 0 10px', width: '300px' }}
            onChange={e => {
              if (e.target.value.includes('arxiv.org/abs')) {
                setUrlInput(e.target.value.replace('abs', 'pdf') + '.pdf')
              } else {
                setUrlInput(e.target.value)
              }
            }}
            placeholder="Upload via URL"
          />
          <Button type="primary" data-testid='upload-url-button' onClick={() => {
            if (urlInput === undefined) {
              setUnderText("<i>Please enter a URL ❌</i>")
              return
            }
            fetchPaperUrl(urlInput)
          }
          } icon={<UploadOutlined />} />

        </Space.Compact>
        {status == 'idle' && !alternative &&
          <>
            <Divider > or start with a demo paper</Divider>
            <Card
              data-testid="upload-demo-paper"
              hoverable
              onClick={() => {
                fetchPaperUrl("https://arxiv.org/pdf/1901.07031.pdf")
              }}
              title="ChexPert: A Large Chest Radiograph Dataset with Uncertainty Labels and Expert Comparison"
              style={{ width: 300, marginTop: 16, borderWidth: '2px' }}
              cover={<img alt="example" src="chexpert.png" />}
            />
          </>
        }


        {status == 'uploading' && <Loading data-testid="upload-loading" />}
        {status == 'uploaded' && <CheckIcon data-testid="upload-successful" />}
        {status == 'error' && <>
          <XIcon data-testid="upload-failed" />
          <MarkdownView
            markdown={errorText ?? ''}
            options={{ tables: false, emoji: true, }}
          /></>}
      </Flex>
      <Spacer y={1} />
      {underText &&
        <MarkdownView
          data-testid="upload-undertext"
          markdown={underText}
          options={{ tables: false, emoji: true, }}
        />
      }
    </Box>
  );
}

export default PaperUploader;
