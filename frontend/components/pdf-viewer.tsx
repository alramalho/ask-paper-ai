import React, { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
// import pdf worker as a url, see `next.config.js` and `pdf-worker.js`
import workerSrc from "../pdf-worker";
import { Box } from "./layout";
import { Button, CSS, Spacer, Text } from "@nextui-org/react";
import { Flex } from "./styles/flex";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerProps {
  pdf: File,
  [key: string]: any
}

const PdfViewer = ({ pdf, ...props }: PdfViewerProps) => {
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
    });
  }, [numPages]);

  return (
    <Box data-testid="pdf" {...props}>
      <Box>
        <Document
          file={pdf}
          onLoadSuccess={onDocumentLoadSuccess}
          options={{
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
          }}
        >

          {Array.from(
            new Array(numPages),
            (el, index) => (
              <>
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                />
                <Spacer y={1} />
              </>
            ),
          )}
        </Document>
      </Box>
    </Box>
  )
};

export default PdfViewer;
